package com.example.smartcity.repository;

import com.example.smartcity.model.ServiceRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface RequestRepository extends MongoRepository<ServiceRequest, String> {
    List<ServiceRequest> findByOwnerId(String ownerId);
    List<ServiceRequest> findByStatus(String status);
}