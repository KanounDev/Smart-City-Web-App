package com.example.smartcity.repository;

import com.example.smartcity.model.Issue;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface IssueRepository extends MongoRepository<Issue, String> {
    List<Issue> findByReporterId(String reporterId);
    List<Issue> findByStatusAndMunicipality(String status, String municipality);
    List<Issue> findByMunicipality(String municipality);
    List<Issue> findByStatus(String status);
}