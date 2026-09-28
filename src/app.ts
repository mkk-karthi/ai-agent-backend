import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middlewares/error.middleware";
import rateLimit from "express-rate-limit";

const app = express();

const allowedOrigins: string[] = ["https://localhost:3000"];
app.use(helmet());
app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) > -1) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: "429 Too Many Requests",
  }),
);

app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
  });
});

app.use("/api", routes);

app.use(errorMiddleware);

export default app;
