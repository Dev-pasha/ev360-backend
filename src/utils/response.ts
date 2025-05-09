/**
 * API Response Utilities
 * 
 * Standard response formatters for API endpoints
 */

/**
 * Standard success response
 * @param data The data to include in the response
 * @param message Optional success message
 */
export const successResponse = (data: any, message = 'Operation successful') => {
    return {
      status: 'success',
      message,
      data
    };
  };
  
  /**
   * Pagination response
   * @param data Array of items
   * @param page Current page number
   * @param limit Items per page
   * @param total Total number of items
   */
  export const paginatedResponse = (data: any[], page: number, limit: number, total: number) => {
    return {
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };
  };
  
  /**
   * Error response
   * @param message Error message
   * @param statusCode HTTP status code
   * @param errors Additional error details
   */
  export const errorResponse = (message: string, statusCode = 500, errors?: any) => {
    return {
      status: 'error',
      message,
      statusCode,
      ...(errors && { errors })
    };
  };