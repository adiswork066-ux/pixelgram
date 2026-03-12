import { useState, useCallback } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useCloudinaryUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const uploadImage = useCallback(async (file, folder = 'posts') => {
        setUploading(true);
        setProgress(0);

        try {
            const token = localStorage.getItem('token');
            
            // Get signature from backend
            const sigResponse = await fetch(
                `${API}/cloudinary/signature?resource_type=image&folder=${folder}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            
            if (!sigResponse.ok) {
                throw new Error('Failed to get upload signature');
            }
            
            const sig = await sigResponse.json();

            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', sig.api_key);
            formData.append('timestamp', sig.timestamp);
            formData.append('signature', sig.signature);
            formData.append('folder', sig.folder);

            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        setProgress(percentComplete);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        setUploading(false);
                        setProgress(100);
                        resolve(response.secure_url);
                    } else {
                        setUploading(false);
                        reject(new Error('Upload failed'));
                    }
                });

                xhr.addEventListener('error', () => {
                    setUploading(false);
                    reject(new Error('Upload failed'));
                });

                xhr.open('POST', `https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`);
                xhr.send(formData);
            });
        } catch (error) {
            setUploading(false);
            throw error;
        }
    }, []);

    return { uploadImage, uploading, progress };
};
