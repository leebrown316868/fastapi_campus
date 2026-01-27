import { apiClient } from './api';

export interface ActivityRegistration {
  id: number;
  activity_id: number;
  user_id: number;
  name: string;
  student_id: string;
  phone?: string;
  remark?: string;
  status: string;
  created_at: string;
  cancelled_at?: string;
  user_name?: string;
  user_email?: string;
}

export interface RegistrationCreate {
  name?: string;
  student_id?: string;
  phone?: string;
  remark?: string;
}

export interface RegistrationListResponse {
  registrations: ActivityRegistration[];
  total: number;
  activity_name?: string;
}

const activityRegistrationsService = {
  // Register for an activity
  create: async (activityId: number, data: RegistrationCreate) => {
    return await apiClient.post<ActivityRegistration>(
      `/api/activities/${activityId}/register`,
      { activity_id: activityId, ...data }
    );
  },

  // Get all registrations for an activity (admin only)
  getActivityRegistrations: async (activityId: number, params?: { skip?: number; limit?: number; status_filter?: string }) => {
    // Build query string
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    const url = `/api/activities/${activityId}/registrations${queryString ? `?${queryString}` : ''}`;
    return await apiClient.get<RegistrationListResponse>(url);
  },

  // Get current user's registrations
  getMyRegistrations: async () => {
    return await apiClient.get<ActivityRegistration[]>('/api/activities/my-registrations');
  },

  // Cancel a registration
  cancel: async (registrationId: number) => {
    await apiClient.delete(`/api/activities/registrations/${registrationId}`);
  },
};

export default activityRegistrationsService;
