package com.example.smartcity.controller;

import com.example.smartcity.model.Review;
import com.example.smartcity.repository.ReviewRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "http://localhost:4200")
public class ReviewController {

    private final ReviewRepository repo;

    public ReviewController(ReviewRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/business/{businessId}")
    public List<Review> getByBusiness(@PathVariable String businessId) {
        return repo.findByBusinessId(businessId);
    }

    @PostMapping
    public Review add(@RequestBody Review review, Authentication auth) {
        // Set username from auth (assuming User principal has username)
        com.example.smartcity.model.User user = (com.example.smartcity.model.User) auth.getPrincipal();
        review.userId = user.username;  // Treat userId as username
        review.date = LocalDateTime.now();
        return repo.save(review);
    }
}