package com.example.smartcity.service;

import com.example.smartcity.model.User;
import com.example.smartcity.model.Role;
import com.example.smartcity.repository.UserRepository;
import com.example.smartcity.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
            JwtService jwtService, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public String register(User user) {
        System.out.println("Register attempt - username: " + user.username + ", role: " + user.role);

        // NEW: Validate municipality for OWNER/ADMIN
        if ((user.role == Role.OWNER || user.role == Role.ADMIN)
                && (user.municipality == null || user.municipality.isEmpty())) {
            throw new IllegalArgumentException("Municipality is required for owners and admins");
        }
        // For CITIZEN, set to null if provided (optional)
        if (user.role == Role.CITIZEN) {
            user.municipality = null;
        }

        user.password = passwordEncoder.encode(user.password);

        try {
            User saved = userRepository.save(user);
            System.out.println("REGISTER SUCCESS - User ID: " + saved.id + ", Role: " + saved.role);
            return jwtService.generateToken(saved);
        } catch (Exception e) {
            System.err.println("SAVE FAILED: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            throw e; // rethrow so controller sees it
        }
    }

    // In AuthService.java

    public String login(User loginRequest) { // Now expect municipality in the incoming object
        System.out.println(
                "Login attempt - username: " + loginRequest.username + ", municipality: " + loginRequest.municipality);

        // Authenticate credentials first
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.username, loginRequest.password));

        User foundUser = userRepository.findByUsername(loginRequest.username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // NEW: Municipality check for OWNER/ADMIN
        if (foundUser.role == Role.OWNER || foundUser.role == Role.ADMIN) {
            if (loginRequest.municipality == null || loginRequest.municipality.isBlank()) {
                throw new IllegalArgumentException("Municipality is required for owners and admins");
            }
            if (!loginRequest.municipality.equalsIgnoreCase(foundUser.municipality)) {
                throw new BadCredentialsException("Invalid municipality for this user");
            }
        } else {
            // For CITIZEN: ignore or reject if municipality was sent
            if (loginRequest.municipality != null && !loginRequest.municipality.isBlank()) {
                throw new IllegalArgumentException("Municipality not applicable for citizens");
            }
        }

        System.out.println("LOGIN SUCCESS - User ID: " + foundUser.id + ", Role: " + foundUser.role + ", Municipality: "
                + foundUser.municipality);

        return jwtService.generateToken(foundUser);
    }
}