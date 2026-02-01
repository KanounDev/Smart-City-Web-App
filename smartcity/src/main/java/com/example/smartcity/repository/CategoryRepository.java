// CategoryRepository.java
package com.example.smartcity.repository;

import com.example.smartcity.model.Category;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CategoryRepository extends MongoRepository<Category, String> {
    // Optional: Add custom queries if needed, e.g., findByName
}