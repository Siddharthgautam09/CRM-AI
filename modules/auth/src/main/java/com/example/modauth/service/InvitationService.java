package com.example.modauth.service;

import com.example.authsvc.infrastructure.security.principal.AuthenticatedUser;
import com.example.modauth.dto.AcceptInvitationRequest;
import com.example.modauth.dto.AcceptInvitationResponse;
import com.example.modauth.dto.CreateInvitationRequest;
import com.example.modauth.dto.InvitationPreviewResponse;
import com.example.modauth.dto.InvitationResponse;

import java.util.UUID;

public interface InvitationService {

    InvitationResponse create(AuthenticatedUser inviter, CreateInvitationRequest request);

    InvitationResponse resend(AuthenticatedUser inviter, UUID invitationId);

    InvitationPreviewResponse preview(String rawToken);

    AcceptInvitationResponse accept(AcceptInvitationRequest request);
}
