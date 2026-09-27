package com.example.modauth.repository;

import com.example.modauth.entity.ModAuthUserRoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ModAuthUserRoleJpaRepository extends JpaRepository<ModAuthUserRoleEntity, UUID> {
}
