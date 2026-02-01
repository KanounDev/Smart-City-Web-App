// src/main/java/com/example/smartcity/repository/ReviewRepository.java
package com.example.smartcity.repository;

import com.example.smartcity.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByBusinessId(String businessId);
}