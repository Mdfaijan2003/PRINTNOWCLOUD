import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";

export interface PrintJobPaymentDetails {
  printJobId: string;
  amount: number;
  currency: string;
  status: string;
}

const protoPath = fileURLToPath(
  new URL("./proto/printjob.proto", import.meta.url),
);

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: true,
});

const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any;

export class PrintJobGrpcClient {
  private readonly client: any;

  constructor(address: string) {
    this.client = new grpcPackage.printjob.PrintJobService(
      address,
      grpc.credentials.createInsecure(),
    );
  }

  async getPaymentDetails(printJobId: string): Promise<PrintJobPaymentDetails> {
    if (!printJobId?.trim()) {
      throw new Error("Print job ID is required");
    }

    return new Promise((resolve, reject) => {
      this.client.GetPaymentDetails(
        {
          print_job_id: printJobId,
        },
        (
          error: grpc.ServiceError | null,
          response: {
            print_job_id: string;
            amount: number;
            currency: string;
            status: string;
          },
        ) => {
          if (error) {
            return reject(error);
          }

          resolve({
            printJobId: response.print_job_id,
            amount: Number(response.amount),
            currency: response.currency,
            status: response.status,
          });
        },
      );
    });
  }
}
