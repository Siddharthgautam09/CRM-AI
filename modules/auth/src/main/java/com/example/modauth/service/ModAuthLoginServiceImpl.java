package com.example.modauth.service;

import com.example.authsvc.api.dto.request.LoginRequest;
import com.example.authsvc.api.dto.response.LoginResult;
import com.example.authsvc.application.service.LockoutService;
import com.example.authsvc.application.service.LoginExecutionService;
import com.example.authsvc.common.exception.InvalidCredentialsException;
import com.example.authsvc.domain.enums.UserType;
import com.example.authsvc.infrastructure.persistence.entity.AuthUserEntity;
import com.example.authsvc.infrastructure.security.password.PasswordHasher;
import com.example.modauth.domain.Role;
import com.example.modauth.dto.ModLoginRequest;
import com.example.modauth.entity.ModAuthUserRoleEntity;
import com.example.modauth.repository.ModAuthUserLookupRepository;
import com.example.modauth.repository.ModAuthUserRoleJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

/**
 * Implements the "Logging in" flow diagram end to end by composing
 * gen-auth-starter's own building blocks in the exact decision order the
 * diagram calls for — lockout, then credentials, then account-active,
 * then terms, then role — rather than re-implementing password hashing,
 * lockout counters or JWT issuance.
 *
 * <p>{@link LoginExecutionService#issueTokens} (not {@code executeLogin}) is
 * used deliberately: this class has already verified the password itself by
 * the time it's called, so it skips straight to session/JWT issuance instead
 * of verifying the password a second time.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModAuthLoginServiceImpl implements ModAuthLoginService {

    private final ModAuthUserLookupRepository userLookupRepo;
    private final ModAuthUserRoleJpaRepository roleRepo;
    private final LockoutService lockoutService;
    private final PasswordHasher passwordHasher;
    private final LoginExecutionService loginExecutor;

    @Value("${modauth.terms.current-version:1}")
    private int currentTermsVersion;

    @Override
    public ModAuthLoginResult login(ModLoginRequest request, String ipAddress, String userAgent) {
        String email = request.email().toLowerCase().strip();
        long loginStart = System.currentTimeMillis();

        // ── 1. Lockout guard ───────────────────────────────────────────────
        lockoutService.checkLockout(email, ipAddress);

        // ── 2. Email + password correct? ────────────────────────────────────
        Optional<AuthUserEntity> userOpt = userLookupRepo.findByEmail(email);
        boolean passwordOk = userOpt.isPresent()
                && userOpt.get().getPasswordHash() != null
                && passwordHasher.verify(request.password(), userOpt.get().getPasswordHash());

        if (!passwordOk) {
            // handleFailure already calls lockoutService.recordFailure internally
            // (plus records the login-attempt audit row and publishes the failed-
            // login event) — calling recordFailure here too double-counted every
            // failure, tripping the lock after 3 attempts instead of 5. Confirmed
            // by an actual test: attempt 3/5 already returned 429.
            loginExecutor.handleFailure(
                    userOpt.map(AuthUserEntity::getTenantId).orElse(null),
                    userOpt.map(AuthUserEntity::getId).orElse(null),
                    email, ipAddress, userAgent, "INVALID_CREDENTIALS");
            log.warn("modauth.login.invalid_credentials email={} ip={}", email, ipAddress);
            throw new InvalidCredentialsException();
        }

        AuthUserEntity user = userOpt.get();

        // ── 3. Is the account active? ───────────────────────────────────────
        if (!user.isActive()) {
            log.info("modauth.login.deactivated userId={}", user.getId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account deactivated. Contact your admin.");
        }

        lockoutService.clearFailure(email, ipAddress);

        Optional<ModAuthUserRoleEntity> roleRow = roleRepo.findById(user.getId());

        // ── 4. Have the terms changed since last login? ────────────────────
        int acceptedVersion = roleRow.map(ModAuthUserRoleEntity::getAcceptedTermsVersion).orElse(0);
        if (acceptedVersion < currentTermsVersion) {
            if (!request.acceptTerms()) {
                log.info("modauth.login.terms_gate userId={} accepted={} current={}",
                        user.getId(), acceptedVersion, currentTermsVersion);
                return ModAuthLoginResult.termsGate(currentTermsVersion);
            }
            roleRow.ifPresent(row -> {
                row.setAcceptedTermsVersion(currentTermsVersion);
                roleRepo.save(row);
            });
        }

        // ── 5. Issue tokens — credentials and account status already verified ──
        LoginRequest starterRequest = new LoginRequest();
        starterRequest.setEmail(email);
        starterRequest.setPassword(request.password());
        LoginResult result = loginExecutor.issueTokens(user, starterRequest, ipAddress, userAgent, loginStart);

        // ── 6. Which role? → dashboard hint ─────────────────────────────────
        Role role = roleRow.map(ModAuthUserRoleEntity::getRole)
                .orElse(user.getUserType() == UserType.SUPER_ADMIN ? Role.SUPER_ADMIN : null);
        String dashboard = role == null ? null : role.dashboardKey();

        log.info("modauth.login.success userId={} role={}", user.getId(), role);
        return ModAuthLoginResult.success(role, dashboard, result);
    }
}
