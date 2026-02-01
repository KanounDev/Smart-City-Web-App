// src/main/java/com/example/smartcity/repository/ServiceRepository.java
package com.example.smartcity.repository;

import com.example.smartcity.model.Service;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ServiceRepository extends MongoRepository<Service, String> {
    List<Service> findByBusinessId(String businessId);
    List<Service> findByOwnerId(String ownerId);
}