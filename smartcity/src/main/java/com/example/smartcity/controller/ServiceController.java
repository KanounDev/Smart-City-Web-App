// src/main/java/com/example/smartcity/controller/ServiceController.java
package com.example.smartcity.controller;

import com.example.smartcity.model.Service;
import com.example.smartcity.repository.ServiceRepository;
import com.example.smartcity.repository.RequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/services")
@CrossOrigin(origins = "http://localhost:4200")
public class ServiceController {

    private final ServiceRepository serviceRepo;
    private final RequestRepository requestRepo;

    public ServiceController(ServiceRepository serviceRepo, RequestRepository requestRepo) {
        this.serviceRepo = serviceRepo;
        this.requestRepo = requestRepo;
    }

    // Get all services for a specific business (owner or public)
    @GetMapping("/business/{businessId}")
    public List<Service> getByBusiness(@PathVariable String businessId) {
        return serviceRepo.findByBusinessId(businessId);
    }

    // Get owner's services across all businesses
    @GetMapping("/my")
    public List<Service> getMyServices(Authentication auth) {
        String ownerId = getOwnerId(auth);
        return serviceRepo.findByOwnerId(ownerId);
    }

    // Add new service (owner only, for their approved business)
    @PostMapping
    public ResponseEntity<Service> create(@RequestBody Service service, Authentication auth) {
        String ownerId = getOwnerId(auth);

        // Validate business belongs to owner and is APPROVED
        var business = requestRepo.findById(service.businessId).orElse(null);
        if (business == null || !business.ownerId.equals(ownerId) || !"APPROVED".equals(business.status)) {
            return ResponseEntity.status(403).build();
        }

        service.ownerId = ownerId;
        return ResponseEntity.ok(serviceRepo.save(service));
    }

    // Update service (owner only)
    @PutMapping("/{id}")
    public ResponseEntity<Service> update(@PathVariable String id, @RequestBody Service updated, Authentication auth) {
        String ownerId = getOwnerId(auth);

        return serviceRepo.findById(id).map(existing -> {
            if (!existing.ownerId.equals(ownerId)) {
                return ResponseEntity.status(403).<Service>build();
            }
            existing.name = updated.name;
            existing.description = updated.description;
            existing.price = updated.price;
            return ResponseEntity.ok(serviceRepo.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // Delete service
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, Authentication auth) {
        String ownerId = getOwnerId(auth);

        return serviceRepo.findById(id).<ResponseEntity<Void>>map(existing -> {
            if (!existing.ownerId.equals(ownerId)) {
                return ResponseEntity.status(403).<Void>build();
            }
            serviceRepo.delete(existing);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private String getOwnerId(Authentication auth) {
        try {
            com.example.smartcity.model.User user = (com.example.smartcity.model.User) auth.getPrincipal();
            return user.id;
        } catch (Exception e) {
            return "";
        }
    }
}