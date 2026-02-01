package com.example.smartcity.controller;

import com.example.smartcity.model.Conversation;
import com.example.smartcity.model.Message;
import com.example.smartcity.model.Role;
import com.example.smartcity.model.User;
import com.example.smartcity.repository.ConversationRepository;
import com.example.smartcity.repository.RequestRepository;
import com.example.smartcity.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = "http://localhost:4200")
public class ConversationController {
    
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final RequestRepository requestRepository;  // For requestsCount
    private final SimpMessagingTemplate messagingTemplate;

    public ConversationController(ConversationRepository conversationRepository, UserRepository userRepository, RequestRepository requestRepository, SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Admins only: List all owners with basic info (id, username, requestsCount) filtered by admin's municipality
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllOwners(Authentication auth) {
        User current = (User) auth.getPrincipal();
        if (current.role != Role.ADMIN) {
            return ResponseEntity.status(403).build();
        }
        String adminMunicipality = current.municipality;
        
        List<User> owners = userRepository.findAll().stream()
                .filter(u -> u.role == Role.OWNER && u.municipality.equals(adminMunicipality))
                .collect(Collectors.toList());

        List<Map<String, Object>> ownerList = owners.stream().map(o -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", o.id);
            map.put("username", o.username);
            map.put("requestsCount", requestRepository.findByOwnerId(o.id).size());
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ownerList);
    }

    // Get conversation by ownerId (admins any in same muni, owners only own)
    @GetMapping("/{ownerId}")
    public ResponseEntity<Conversation> getConversation(@PathVariable String ownerId, Authentication auth) {
        User current = (User) auth.getPrincipal();
        User targetOwner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));  // Better exception handling
        
        if (current.role == Role.OWNER) {
            if (!current.id.equals(ownerId)) {
                return ResponseEntity.status(403).build();
            }
        } else if (current.role == Role.ADMIN) {
            if (!current.municipality.equals(targetOwner.municipality)) {
                return ResponseEntity.status(403).build();
            }
        } else {
            return ResponseEntity.status(403).build();
        }
        
        return conversationRepository.findById(ownerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(new Conversation()));  // Return empty if none
    }

    // Send message (admins to any in same muni, owners to own) + broadcast via WebSocket
    @PostMapping("/{ownerId}/messages")
    public ResponseEntity<Void> sendMessage(@PathVariable String ownerId, @RequestBody String content, Authentication auth) {
        User current = (User) auth.getPrincipal();
        User targetOwner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));  // Better exception handling
        
        if (current.role == Role.OWNER) {
            if (!current.id.equals(ownerId)) {
                return ResponseEntity.status(403).build();
            }
        } else if (current.role == Role.ADMIN) {
            if (!current.municipality.equals(targetOwner.municipality)) {
                return ResponseEntity.status(403).build();
            }
        } else {
            return ResponseEntity.status(403).build();
        }
        
        Conversation conv = conversationRepository.findById(ownerId).orElse(new Conversation());
        conv.id = ownerId;
        conv.ownerId = ownerId;

        Message msg = new Message();
        msg.senderId = current.id;
        msg.senderRole = current.role.name();
        msg.content = content;
        msg.timestamp = LocalDateTime.now();

        conv.messages.add(msg);
        conversationRepository.save(conv);

        // Broadcast new message to the per-owner topic
        messagingTemplate.convertAndSend("/topic/conversations/" + ownerId, msg);

        return ResponseEntity.ok().build();
    }
}