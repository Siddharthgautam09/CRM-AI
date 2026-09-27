package com.example.modauth.dto;

import com.example.modauth.domain.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Invite a Tenant Admin, Team Lead or Broker into the caller's brokerage. "
        + "Who can invite whom follows the platform hierarchy — see InvitationServiceImpl.requireCanInvite.")
public record CreateInvitationRequest(
        @NotBlank
        @Schema(example = "Jordan Lee", requiredMode = Schema.RequiredMode.REQUIRED)
        String name,

        @NotBlank @Email
        @Schema(example = "jordan.lee@example.com", requiredMode = Schema.RequiredMode.REQUIRED)
        String email,

        @NotNull
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED)
        Role role,

        @Schema(description = "Required when role is TEAM_LEAD or BROKER; ignored for TENANT_ADMIN",
                example = "North Region")
        String teamName
) {
}
