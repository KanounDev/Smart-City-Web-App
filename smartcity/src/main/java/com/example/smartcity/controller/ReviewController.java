package com.example.smartcity.controller;

import com.example.smartcity.model.Review;
import com.example.smartcity.repository.RequestRepository;
import com.example.smartcity.repository.ReviewRepository;
import com.example.smartcity.service.NotificationService;

import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "http://localhost:4200")
public class ReviewController {

    private final ReviewRepository repo;
    private final RequestRepository requestRepository; // ← NEW
    private final NotificationService notificationService; // ← NEW

    public ReviewController(ReviewRepository repo,
            RequestRepository requestRepository,
            NotificationService notificationService) {
        this.repo = repo;
        this.requestRepository = requestRepository;
        this.notificationService = notificationService;
    }

    @GetMapping("/business/{businessId}")
    public List<Review> getByBusiness(@PathVariable String businessId) {
        return repo.findByBusinessId(businessId);
    }

    @PostMapping
    public Review add(@RequestBody Review review, Authentication auth) {
        com.example.smartcity.model.User user = (com.example.smartcity.model.User) auth.getPrincipal();
        review.userId = user.username;
        review.date = LocalDateTime.now();

        Review saved = repo.save(review);

        // 🔥 Trigger notification to the business OWNER
        requestRepository.findById(review.businessId).ifPresent(business -> {
            notificationService.createReviewAddedNotification(business.ownerId, business.name);
        });

        return saved;
    }
}