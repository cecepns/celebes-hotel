export const API_ENDPOINTS = {
  SETTINGS: {
    PUBLIC: '/settings/public',
  },
  ROOMS: {
    PUBLIC: '/rooms',
  },
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  MEMBER: {
    DASHBOARD: '/member/dashboard',
    POINTS_BREAKDOWN: '/member/points-breakdown',
    REWARDS: '/member/rewards',
    REDEEM_REWARD: '/member/rewards/redeem',
    MY_VOUCHERS: '/member/my-vouchers',
    MISSIONS: '/member/missions',
    CLAIM_MISSION: (id) => `/member/missions/${id}/claim`,
    TRANSACTIONS: '/member/transactions',
    RESERVATIONS: '/member/reservations',
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    MEMBERS: {
      LIST: '/admin/members',
      CREATE: '/admin/members',
      DETAIL: (id) => `/admin/members/${id}`,
      UPDATE: (id) => `/admin/members/${id}`,
      DELETE: (id) => `/admin/members/${id}`,
      EXPORT: '/admin/members/export',
    },
    USERS: {
      LIST: '/admin/users',
      CREATE: '/admin/users',
      DETAIL: (id) => `/admin/users/${id}`,
      UPDATE: (id) => `/admin/users/${id}`,
      DELETE: (id) => `/admin/users/${id}`,
    },
    TRANSACTIONS: {
      LIST: '/admin/transactions',
      CREATE: '/admin/transactions',
      EXPORT: '/admin/transactions/export',
    },
    REWARDS: {
      LIST: '/admin/rewards',
      CREATE: '/admin/rewards',
      UPDATE: (id) => `/admin/rewards/${id}`,
      DELETE: (id) => `/admin/rewards/${id}`,
    },
    MISSIONS: {
      LIST: '/admin/missions',
      CREATE: '/admin/missions',
      UPDATE: (id) => `/admin/missions/${id}`,
      DELETE: (id) => `/admin/missions/${id}`,
    },
    VOUCHERS: {
      LIST: '/admin/vouchers',
      CHECK: (code) => `/admin/vouchers/check/${encodeURIComponent(code)}`,
      VERIFY: '/admin/vouchers/verify',
    },
    RESERVATIONS: {
      LIST: '/admin/reservations',
      UPDATE: (id) => `/admin/reservations/${id}`,
    },
    ROOMS: {
      LIST: '/admin/rooms',
      CREATE: '/admin/rooms',
      DETAIL: (id) => `/admin/rooms/${id}`,
      UPDATE: (id) => `/admin/rooms/${id}`,
      DELETE: (id) => `/admin/rooms/${id}`,
    },
    SETTINGS: {
      GET: '/admin/settings',
      UPDATE: '/admin/settings',
    },
  },
};
