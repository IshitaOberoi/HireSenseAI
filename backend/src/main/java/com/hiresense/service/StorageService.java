package com.hiresense.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    /**
     * Upload a file and return a unique storage key/path.
     */
    String uploadFile(MultipartFile file);

    /**
     * Download or retrieve a file as a resource.
     */
    Resource loadFileAsResource(String fileKey);
}
