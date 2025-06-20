// frontend/src/js/utils/api.js
import { auth } from './auth.js';

export const api = {
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.hostname}:3000`
        : window.location.origin,

    headers(isFormData = false) {
        const token = auth.getToken();
        const tempAuth = auth.tempAuth.get();
        const headers = {};
        
        // CRITICAL: Do NOT set Content-Type for FormData
        if (!isFormData) {
            headers['Accept'] = 'application/json';
            headers['Content-Type'] = 'application/json';
        } else {
            // Only set Accept header for FormData, let browser set Content-Type with boundary
            headers['Accept'] = 'application/json';
        }
    
        // Priority handling for force password change
        if (window.location.hash === '#force-change-password') {
            if (tempAuth?.token) {
                headers['Authorization'] = `Bearer ${tempAuth.token}`;
                console.log('Using temp auth token for force change password', {
                    tokenPreview: tempAuth.token.substring(0, 10) + '...'
                });
                return headers;
            }
        }
    
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn('No token available for request');
        }
    
        return headers;
    },

    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            let retryCount = 0;
            const MAX_RETRIES = 2;

            // Debug log the initial request
            console.log('=== API Request Debug ===', {
                endpoint,
                url,
                method: options.method || 'GET',
                isFormData: options.body instanceof FormData,
                options
            });

            const makeRequest = async () => {
                const isPublicEndpoint = endpoint.includes('/api/users/login') || 
                                       endpoint.includes('/api/users/register') ||
                                       endpoint.includes('/api/users/force-change-password');

                let headers = {};

                if (!isPublicEndpoint) {
                    const token = auth.getToken();
                    console.log('Token check:', {
                        hasToken: !!token,
                        isExpired: auth.isTokenExpired(),
                        tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
                    });

                    if (!token || auth.isTokenExpired()) {
                        const refreshed = await auth.refreshToken();
                        console.log('Token refresh attempt:', { success: refreshed });
                        if (!refreshed) {
                            throw new Error('Authentication required');
                        }
                    }
                    
                    // Get fresh headers after potential token refresh
                    headers = this.headers(options.body instanceof FormData);
                } else {
                    headers = {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    };
                }

                // CRITICAL FIX: Handle FormData properly
                if (options.body instanceof FormData) {
                    // Remove Content-Type to let browser set it with boundary
                    delete headers['Content-Type'];
                    console.log('FormData detected - removing Content-Type header');
                }

                const requestOptions = {
                    ...options,
                    headers,
                    credentials: 'include'
                };

                console.log('Making request with options:', {
                    url,
                    method: requestOptions.method || 'GET',
                    hasToken: !!requestOptions.headers['Authorization'],
                    hasContentType: !!requestOptions.headers['Content-Type'],
                    isFormData: options.body instanceof FormData,
                    headers: requestOptions.headers
                });

                const response = await fetch(url, requestOptions);
                
                console.log('Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries([...response.headers])
                });

                if (response.status === 401 && !isPublicEndpoint && retryCount < MAX_RETRIES) {
                    console.log(`Retry attempt ${retryCount + 1} for 401 response`);
                    const refreshed = await auth.refreshToken();
                    if (refreshed) {
                        retryCount++;
                        return makeRequest();
                    } else {
                        auth.logout();
                        window.location.hash = '#login';
                        return {
                            success: false,
                            message: 'Authentication required'
                        };
                    }
                }

                let data;
                const responseText = await response.text();
                console.log('Raw response text:', responseText);

                try {
                    data = JSON.parse(responseText);
                    console.log('Parsed response data:', data);
                } catch (e) {
                    console.error('Error parsing response:', e);
                    console.log('Failed to parse response text:', responseText);
                    data = { success: false, message: response.statusText };
                }

                if (response.ok) {
                    const result = {
                        success: true,
                        data: data.data || data,
                        pagination: data.pagination,
                        message: data.message
                    };
                    console.log('Final success response:', result);
                    return result;
                }

                const errorResult = {
                    success: false,
                    message: data.message || `Request failed with status: ${response.status}`,
                    error: data.error
                };
                console.log('Final error response:', errorResult);
                return errorResult;
            };

            return await makeRequest();

        } catch (error) {
            console.error('API Request Failed:', {
                endpoint,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            });
            return {
                success: false,
                message: error.message || 'An unexpected error occurred'
            };
        }
    },

    async get(endpoint) {
        try {
            const options = { method: 'GET' };
            console.log(`Initiating GET request to ${endpoint}`);
            const response = await this.request(endpoint, options);
            console.log(`GET Response for ${endpoint}:`, {
                success: response.success,
                hasData: !!response.data,
                hasPagination: !!response.pagination
            });
            return response;
        } catch (error) {
            console.error('GET Request Error:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            return {
                success: false,
                message: error.message || 'Failed to make GET request'
            };
        }
    },

    async post(endpoint, data, isFormData = false, explicitToken = null) {
        try {
            const options = {
                method: 'POST',
                body: isFormData ? data : JSON.stringify(data)
            };
            
            console.log(`Initiating POST request to ${endpoint}`, {
                isFormData,
                hasExplicitToken: !!explicitToken
            });
            
            const response = await this.request(endpoint, options);
            console.log(`POST Response for ${endpoint}:`, {
                success: response.success,
                hasData: !!response.data
            });
            return response;
        } catch (error) {
            console.error('POST Request Error:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            return {
                success: false,
                message: error.message || 'Failed to make POST request'
            };
        }
    },

    async put(endpoint, data, isFormData = false) {
        try {
            const options = {
                method: 'PUT',
                body: isFormData ? data : JSON.stringify(data)
            };

            console.log(`Initiating PUT request to ${endpoint}`, {
                isFormData,
                dataType: isFormData ? 'FormData' : 'JSON'
            });
            
            const response = await this.request(endpoint, options);
            console.log(`PUT Response for ${endpoint}:`, {
                success: response.success,
                hasData: !!response.data
            });
            return response;
        } catch (error) {
            console.error('PUT Request Error:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            return {
                success: false,
                message: error.message || 'Failed to make PUT request'
            };
        }
    },

    async delete(endpoint) {
        try {
            const options = { method: 'DELETE' };
            console.log(`Initiating DELETE request to ${endpoint}`);
            const response = await this.request(endpoint, options);
            console.log(`DELETE Response for ${endpoint}:`, {
                success: response.success,
                hasData: !!response.data
            });
            return response;
        } catch (error) {
            console.error('DELETE Request Error:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            return {
                success: false,
                message: error.message || 'Failed to make DELETE request'
            };
        }
    }
};