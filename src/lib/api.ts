export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function paginatedResponse<T>(data: T, page: number, limit: number, total: number): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function errorResponse(error: string, statusCode?: number): ApiResponse {
  return { success: false, error };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams & { skip: number; take: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortBy, sortOrder, skip: (page - 1) * limit, take: limit };
}
