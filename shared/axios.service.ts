import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { Services } from './enums';
import { stringify, parse } from 'flatted';
import axiosRetry from 'axios-retry';

@Injectable()
class AxioService {
  private axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private createAxiosInstance(baseURL: string, token?: string): AxiosInstance {
    const instance = axios.create({
      baseURL,
      timeout: 30000,
    });

    // Configure axios-retry
    axiosRetry(instance, {
      retries: 3, // Number of retries
      retryDelay: (retryCount) => retryCount * 1000, // Use exponential delay between retries
      retryCondition: (error: any) => {
        // Retry only for network errors (no response, address not found)
        return (
          axiosRetry.isNetworkError(error) ||
          error.code === 'ECONNABORTED' || // Timeout
          error.code === 'ENOTFOUND' || // Address not found
          error.code === 'ECONNREFUSED' || // Connection refused
          (error.response && error.response.status >= 500)
        );
      },
      onRetry: (attempt, error) => {
        console.log(`Retry attempt: ${attempt}, Error: ${error.message}`);
      },
    });

    // Request Interceptor for setting headers
    instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        config.headers.Accept = 'application/json';
        if (token) {
          config.headers.authorization = `Bearer ${token}`;
        }
        config.timeout = 30000;
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response Interceptor for error handling
    instance.interceptors.response.use(
      (response) => {
        // Parse and stringify to handle circular references
        const safeData = parse(stringify(response.data));
        return { ...response, data: safeData };
      },
      (error) => {
        // Check if error has response (indicating it reached the server)
        if (error.response) {
          const { status, data } = error.response;
          console.error('Request failed:', {
            status,
            data,
          });
          // Return a structured error object to the client
          return Promise.reject({
            status,
            message: data.message || 'An error occurred',
            data,
          });
        } else {
          // Network or other axios errors
          console.error('Network or other error:', error.message);
          return Promise.reject({
            status: null,
            message: error.message,
            data: null,
          });
        }
      },
    );

    return instance;
  }

  // Authenticated Axios instance
  useAuthAxios(service: Services) {
    const baseURL = this.configService.get<string>(`${service}_BASE_URL`);
    const token = this.configService.get<string>('ACCESS_TOKEN');

    if (baseURL) return this.createAxiosInstance(baseURL, token);
  }

  // General Axios instance without authentication
  useAxios(service: Services) {
    const baseURL = this.configService.get<string>(`${service}_BASE_URL`);
    if (baseURL) return this.createAxiosInstance(baseURL);
  }

  useExtAxios(service: Services) {
    const baseURL = this.configService.get<string>(`${service}_BASE_URL`);
    const token = this.configService.get<string>(`${service}_ACCESS_TOKEN`);

    if (baseURL) return this.createAxiosInstance(baseURL, token);
  }

  // /*
  //  * API methods for wallets.
  //  */
  // wallets = {
  //   createWallet: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.post(endpoint, data);
  //   },
  //   getAllWallets: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getOneWallet: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getAllWalletTransactions: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getWalletBalance: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   updateWallet: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.put(endpoint, data);
  //   },
  //   deleteWallet: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.delete(endpoint);
  //   },
  // };

  // /*
  //  * API methods for wallets.
  //  */
  // trasnfers = {
  //   initiateTransfer: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.post(endpoint, data);
  //   },
  //   getTransferFees: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getBanks: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   verifyRecipientAccount: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.post(endpoint, data);
  //   },
  //   retryTransfer: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.post(endpoint, data);
  //   },
  // };

  // /*
  //  * API methods for bill payments.
  //  */
  // bill_payments = {
  //   getBillCategories: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getBillersInfo: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   getBillInfo: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   validateItemInfo: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  //   createBillPayment: async (endpoint: string, data: object) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.post(endpoint, data);
  //   },
  //   getBillPaymentStatus: async (endpoint: string) => {
  //     const axiosInstance = this.useExtAxios(Services.FLW);
  //     return await axiosInstance.get(endpoint);
  //   },
  // };
}

export default AxioService;
