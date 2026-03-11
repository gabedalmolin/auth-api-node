import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "../config/env";
import { buildSwaggerSpec, resolveSwaggerBaseUrl } from "../docs/swagger";

const router = Router();

router.get("/docs.json", (req, res) => {
  if (!env.DOCS_ENABLED) {
    return res.status(404).json({ message: "docs disabled" });
  }

  return res.json(buildSwaggerSpec(resolveSwaggerBaseUrl(req)));
});

router.use(
  "/docs",
  (_req, res, next) => {
    if (!env.DOCS_ENABLED) {
      return res.status(404).json({ message: "docs disabled" });
    }

    return next();
  },
  ...swaggerUi.serve,
);

router.get("/docs", (req, res, next) => {
  if (!env.DOCS_ENABLED) {
    return res.status(404).json({ message: "docs disabled" });
  }

  return swaggerUi.setup(buildSwaggerSpec(resolveSwaggerBaseUrl(req)))(
    req,
    res,
    next,
  );
});

export default router;
