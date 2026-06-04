import { Hono } from "hono";
import authRouter from "./routes/auth";
import subscriptionRouter from "./routes/subscription";
import profileRouter from "./routes/profile";
import productsRouter from "./routes/products";
import adminRouter from "./routes/admin";
import categoriesRouter from "./routes/categories";
import generateDescriptionRouter from "./routes/generate-description";
import brandingRouter from "./routes/branding";
import paymentsRouter from "./routes/payments";
import paymentFilesRouter from "./routes/payment-files";
import referralsRouter from "./routes/referrals";

const app = new Hono<{ Bindings: Env }>();

app.route('/api/generate-description', generateDescriptionRouter);
app.route('/api/products', productsRouter);
app.route('/api/categories', categoriesRouter);
app.route('/api/branding', brandingRouter);
app.route('/api/payments', paymentsRouter);
app.route('/api/payment-files', paymentFilesRouter);
app.route('/api/referrals', referralsRouter);
app.route('/api', authRouter);
app.route('/api/subscription', subscriptionRouter);
app.route('/api/profile', profileRouter);
app.route('/api/admin', adminRouter);

export default app;
