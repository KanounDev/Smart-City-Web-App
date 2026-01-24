package com.example.smartcity.service;

import com.example.smartcity.model.User;
import com.example.smartcity.model.Role;
import com.example.smartcity.repository.UserRepository;
import com.example.smartcity.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
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

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public String register(User user) {
        System.out.println("Register attempt - username: " + user.username);
        System.out.println("Role before save: " + user.role);

        // Prevent null role
        if (user.role == null) {
            user.role = Role.CITIZEN;
            System.out.println("Assigned default role: CITIZEN");
        }

        user.password = passwordEncoder.encode(user.password);
        System.out.println("Encoded password ready");

        try {
            User saved = userRepository.save(user);
            System.out.println("SAVE SUCCESS - User ID: " + saved.id);
            return jwtService.generateToken(saved);
        } catch (Exception e) {
            System.err.println("SAVE FAILED: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            throw e; // rethrow so controller sees it
        }
    }

    public String login(User user) {
        System.out.println("Login attempt - username: " + user.username);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.username, user.password)
        );

        User foundUser = userRepository.findByUsername(user.username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        System.out.println("LOGIN SUCCESS - User ID: " + foundUser.id + ", Role: " + foundUser.role);

        return jwtService.generateToken(foundUser);
    }
}