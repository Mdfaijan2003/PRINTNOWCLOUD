import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";
import { PrintJobService } from "../../modules/printJob/printJob.service.js";
import { printJobService } from "../../modules/printJob/printJob.container.js";

const protoPath = fileURLToPath(
  new URL("./proto/printjob.proto", import.meta.url),
);

//We need to make it production ready by adding error handling, logging, and other necessary features. And also removing "as any"
const grpcPackage = grpc.loadPackageDefinition(
  protoLoader.loadSync(protoPath, {
    keepCase: true,
  }),
) as any;

export function createPrintJobGrpcService(printJobService: PrintJobService) {
  return {
    GetPaymentDetails: async (call: any, callback: any) => {
      try {
        const { print_job_id } = call.request;

        const job = await printJobService.getJobById(print_job_id);

        callback(null, {
          print_job_id: job.id,
          amount: job.pricing.totalAmount,
          currency: job.pricing.currency,
          status: job.status,
        });
      } catch (error) {
        callback(error);
      }
    },
  };
}

export function startPrintJobGrpcServer() {
  const server = new grpc.Server();

  server.addService(
    grpcPackage.printjob.PrintJobService.service,
    createPrintJobGrpcService(printJobService),
  );

  server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        throw error;
      }

      console.log(`gRPC server running on port ${port}`);
    },
  );
}
