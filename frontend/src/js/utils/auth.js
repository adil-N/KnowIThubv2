// frontend/src/js/utils/auth.js
export const auth = {
    tempAuth: {
        data: null,
        set(tempData) {
            if (!tempData) {
                console.warn('Attempting to set empty temp auth data');
                return false;
            }
            localStorage.setItem('tempAuthData', JSON.stringify(tempData));
            this.data = tempData;
            return true;
        },
        get() {
            if (!this.data) {
                const storedData = localStorage.getItem('tempAuthData');
                if (storedData) {
                    try {
                        this.data = JSON.parse(storedData);
                    } catch (e) {
                        console.error('Error parsing stored temp auth data:', e);
                    }
                }
            }
            return this.data;
        },
        clear() {
            this.data = null;
            localStorage.removeItem('tempAuthData');
        }
    },

    user: {
        data: null,  // Add this line to match tempAuth structure
        set(userData) {
            console.log('Setting user data:', userData);
            if (!userData) {
                console.warn('Attempting to set empty user data');
                return false;
            }
    
            try {
                // Ensure passwordResetRequired is explicitly set
                if (userData.user) {
                    userData.user.passwordResetRequired = !!userData.user.passwordResetRequired;
                }
                
                this.data = userData;
                localStorage.setItem('userData', JSON.stringify(userData));
                
                return true;
            } catch (error) {
                console.error('Error setting user data:', error);
                return false;
            }
        },
        get() {  // Add this method
            if (!this.data) {
                const storedData = localStorage.getItem('userData');
                if (storedData) {
                    try {
                        this.data = JSON.parse(storedData);
                    } catch (e) {
                        console.error('Error parsing stored user data:', e);
                    }
                }
            }
            return this.data;
        },
        clear() {
            this.data = null;
            localStorage.removeItem('userData');
            localStorage.removeItem('tokenExpiration');
        }
    },

    parseJwt(token) {
        try {
            if (!token) {
                console.warn('No token provided to parseJwt');
                return null;
            }
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error parsing JWT:', e);
            return null;
        }
    },

    async refreshToken() {
        console.log('Attempting to refresh token...');
        try {
            if (!this.isTokenExpired()) {
                console.log('Token is still valid, no refresh needed');
                return true;
            }
    
            const token = this.getToken();
            if (!token) {
                console.log('No token available');
                return false;
            }
    
            const response = await fetch(`${window.location.origin}/api/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                credentials: 'include'
            });
    
            if (!response.ok) {
                throw new Error('Token refresh failed');
            }
    
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Token refresh failed');
            }
    
            // Update token
            this.updateToken(data.token);
            return true;
    
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    },

isTokenExpired() {
    const token = localStorage.getItem('token');
    if (!token) return true;
    
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 < Date.now();
    } catch (e) {
        return true;
    }
},


    updateToken(newToken) {
        localStorage.setItem('token', newToken);
        this.getToken();
    },

    isAuthenticated() {
        const token = this.getToken();
        const userData = this.user.get();
        const tempAuth = this.tempAuth.get();
        
        if (!token && !tempAuth?.token) return false;
        
        // If we have temp auth, consider it valid for force-change-password
        if (window.location.hash === '#force-change-password' && tempAuth?.token) {
            return true;
        }
        
        // For regular auth
        if ((!userData && !tempAuth) || this.isTokenExpired()) {
            return false;
        }
        
        return true;
    },

    getToken() {
        // For force-change-password page, prefer temp auth token
        if (window.location.hash === '#force-change-password') {
            const tempAuth = this.tempAuth.get();
            if (tempAuth?.token) {
                console.log('Using temporary auth token for password change');
                return tempAuth.token;
            }
        }
    
        // Get regular token
        const token = localStorage.getItem('token');
        
        // Log token status (but don't expose full token)
        if (token) {
            console.log('Retrieved stored token:', {
                tokenPreview: token.substring(0, 10) + '...',
                isExpired: this.isTokenExpired()
            });
        } else {
            console.log('No token found in storage');
        }
    
        return token;
    },
    getTempAuthToken() {
        const tempAuth = this.tempAuth.get();
        return tempAuth?.token || null;
    },
    async login(userData) {
        try {
            if (!userData || !userData.token) {
                throw new Error('Invalid login data');
            }
    
            // Clear existing data
            this.tempAuth.clear();
            this.user.clear();
            
            // Set the token first
            localStorage.setItem('token', userData.token);
            
            // Handle password reset case
            if (userData.user?.passwordResetRequired === true) {
                console.log('Password reset required, setting temp auth');
                const tempAuthSet = this.tempAuth.set({
                    token: userData.token,
                    user: userData.user
                });
                if (!tempAuthSet) {
                    throw new Error('Failed to set temporary authentication');
                }
                localStorage.setItem('resetEmail', userData.user.email);
                setTimeout(() => {
                    window.location.hash = '#force-change-password';
                }, 100);
                return true;
            }
    
            // For normal login, set the user data
            const success = this.user.set({
                token: userData.token,
                user: {
                    ...userData.user,
                    passwordResetRequired: false
                }
            });
    
            if (success) {
                // Update token expiration
                const tokenData = this.parseJwt(userData.token);
                if (tokenData && tokenData.exp) {
                    localStorage.setItem('tokenExpiration', tokenData.exp * 1000);
                }
            }
            return success;
        } catch (error) {
            console.error('Login error:', error);
            this.logout();
            return false;
        }
    },

    updateToken(token) {
        if (token) {
            localStorage.setItem('token', token);
            // Update expiration time
            const tokenData = this.parseJwt(token);
            if (tokenData && tokenData.exp) {
                localStorage.setItem('tokenExpiration', tokenData.exp * 1000);
            }
            console.log('Token updated successfully');
            return true;
        }
        return false;
    },

    logout() {
        this.user.clear();
        this.tempAuth.clear();
        localStorage.clear(); // Clear all localStorage data
        console.log('Logged out, clearing all auth data');
    },

    handleAuthError() {
        console.warn('Auth error detected, logging out');
        this.logout();
        window.location.hash = '#login';
    },

    async init() {
        try {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('userData');
            
            console.log('Initializing auth:', {
                hasStoredData: !!userData,
                hasToken: !!token
            });
    
            if (!token) {
                console.log('No token found during initialization');
                this.logout();
                return false;
            }
    
            // Check token expiration
            if (this.isTokenExpired()) {
                console.log('Token expired during initialization, attempting refresh...');
                const refreshed = await this.refreshToken();
                if (!refreshed) {
                    console.log('Token refresh failed, logging out');
                    this.logout();
                    return false;
                }
            }
    
            if (userData) {
                try {
                    const parsedData = JSON.parse(userData);
                    const currentToken = this.getToken();
                    
                    // Ensure the nested user structure is maintained
                    const updatedUserData = {
                        token: currentToken,
                        user: parsedData.user // Maintain the nested user object
                    };
                    
                    return this.user.set(updatedUserData);
                } catch (error) {
                    console.error('Error parsing user data during init:', error);
                    this.logout();
                    return false;
                }
            }
    
            return false;
        } catch (error) {
            console.error('Error initializing auth:', error);
            this.logout();
            return false;
        }
    }
};