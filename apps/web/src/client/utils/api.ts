import type { ApiResponse, ApiSuccessResponse } from '@agentic-rag/shared';

const API_BASE = '/api/v1';

/**
 * 获取 API Key
 * MVP 阶段使用环境变量配置，生产环境应使用更安全的方式
 */
function getApiKey(): string {
  // Vite 环境变量，默认使用开发环境的 test-api-key
  const apiKey = import.meta.env.VITE_API_KEY || 'test-api-key';
  return apiKey;
}

/**
 * 获取认证 headers
 */
function getAuthHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
  };
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 网络错误类
 */
export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * 基础 fetch 封装
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new NetworkError(
      '无法连接到服务器，请确保后端服务已启动',
      error
    );
  }

  // 处理空响应
  const text = await response.text();
  if (!text) {
    throw new NetworkError('服务器返回空响应');
  }

  let data: ApiResponse<T>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NetworkError(`无法解析服务器响应: ${text.substring(0, 100)}`);
  }

  if (!data.success) {
    throw new ApiError(
      data.error.code,
      data.error.message,
      data.error.details
    );
  }

  return data.data;
}

/**
 * GET 请求
 */
export async function get<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'GET' });
}

/**
 * POST 请求
 */
export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 请求
 */
export async function put<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH 请求
 */
export async function patch<T>(endpoint: string, body?: unknown): Promise<T> {
  return request<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 请求
 */
export async function del<T>(endpoint: string): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE' });
}

/**
 * 带分页的 GET 请求
 */
export async function getPaginated<T>(
  endpoint: string,
  params?: { page?: number; pageSize?: number }
): Promise<ApiSuccessResponse<T[]>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));

  const queryString = searchParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
  } catch (error) {
    throw new NetworkError(
      '无法连接到服务器，请确保后端服务已启动',
      error
    );
  }

  // 处理空响应
  const text = await response.text();
  if (!text) {
    throw new NetworkError('服务器返回空响应');
  }

  let data: ApiResponse<T[]>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new NetworkError(`无法解析服务器响应: ${text.substring(0, 100)}`);
  }

  if (!data.success) {
    throw new ApiError(
      data.error.code,
      data.error.message,
      data.error.details
    );
  }

  return data;
}

/**
 * 文件上传请求
 */
export async function uploadFile<T>(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 进度监听
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as ApiResponse<T>;
          if (data.success) {
            resolve(data.data);
          } else {
            reject(new ApiError(data.error.code, data.error.message, data.error.details));
          }
        } catch {
          reject(new NetworkError(`无法解析服务器响应: ${xhr.responseText.substring(0, 100)}`));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.error) {
            reject(new ApiError(data.error.code, data.error.message, data.error.details));
          } else {
            reject(new NetworkError(`请求失败: ${xhr.status}`));
          }
        } catch {
          reject(new NetworkError(`请求失败: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new NetworkError('无法连接到服务器，请确保后端服务已启动'));
    });

    xhr.addEventListener('abort', () => {
      reject(new NetworkError('上传已取消'));
    });

    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${getApiKey()}`);
    xhr.send(formData);
  });
}

/**
 * 文件下载请求
 */
export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new NetworkError(`下载失败: ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
