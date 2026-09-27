package com.example.modauth.dto;

import com.example.authsvc.common.validation.PasswordConfirmationRequest;
import com.example.authsvc.common.validation.PasswordsMatch;
import com.example.authsvc.common.validation.ValidPassword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;

/**
 * Mirrors gen-auth-starter's own {@code MagicLinkVerifyRequest} shape
 * (token + newPassword + confirmPassword) so it gets the exact same
 * password-rule validation and "which rule failed" error message for free
 * via the starter's {@code GlobalExceptionHandler}.
 */
@PasswordsMatch
@Schema(description = "Sets the invited user's password and finalizes account creation")
public record AcceptInvitationRequest(
        @NotBlank
        @Schema(description = "The raw token from the invitation email", requiredMode = Schema.RequiredMode.REQUIRED)
        String token,

        @ValidPassword
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String newPassword,

        @NotBlank
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        String confirmPassword,

        // Boxed (Boolean, not boolean) so an omitted field fails @AssertTrue's
        // clean 400 ("must accept the terms") instead of a raw Jackson 500 —
        // see ModLoginRequest.acceptTerms for why boolean record components
        // need this with Jackson 3's record deserializer.
        @AssertTrue(message = "You must accept the terms and privacy notice to continue")
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        Boolean acceptTerms
) implements PasswordConfirmationRequest {
    public AcceptInvitationRequest {
        acceptTerms = acceptTerms != null && acceptTerms;
    }
}
