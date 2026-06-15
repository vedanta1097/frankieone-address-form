import { Router, Request, Response } from "express";
import db from "../db";
import { SCHEMAS } from "shared";

const router = Router();

// POST /api/addresses — validate and save an address
router.post("/", (req: Request, res: Response) => {
  const { country_code, fields } = req.body as {
    country_code?: string;
    fields?: Record<string, string>;
  };

  if (!country_code || typeof country_code !== "string") {
    res.status(400).json({
      success: false,
      errors: { country_code: "country_code is required" },
    });
    return;
  }

  if (!fields || typeof fields !== "object") {
    res.status(400).json({
      success: false,
      errors: { fields: "fields object is required" },
    });
    return;
  }

  const schema = SCHEMAS[country_code];
  if (!schema) {
    res.status(400).json({
      success: false,
      errors: { country_code: `Unsupported country: ${country_code}` },
    });
    return;
  }

  const result = schema.safeParse(fields);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const [field, messages] of Object.entries(
      result.error.flatten().fieldErrors,
    )) {
      errors[field] = (messages as string[])[0];
    }
    res.status(400).json({ success: false, errors });
    return;
  }

  const created_at = new Date().toISOString();

  const stmt = db.prepare(
    "INSERT INTO addresses (country_code, fields, created_at) VALUES (?, ?, ?)",
  );
  const info = stmt.run(country_code, JSON.stringify(result.data), created_at);

  res.status(201).json({
    success: true,
    data: {
      id: info.lastInsertRowid,
      country_code,
      fields: result.data,
      created_at,
    },
  });
});

// GET /api/addresses — list saved addresses, optional ?country=USA&page=1&limit=20
router.get("/", (req: Request, res: Response) => {
  const { country } = req.query;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const offset = (page - 1) * limit;

  type Row = {
    id: number;
    country_code: string;
    fields: string;
    created_at: string;
  };

  const conditions: string[] = [];
  const filterParams: (string | number)[] = [];

  if (country && typeof country === "string") {
    conditions.push("country_code = ?");
    filterParams.push(country);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT * FROM addresses ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    )
    .all(...filterParams, limit, offset) as Row[];

  const total = (
    db
      .prepare(`SELECT COUNT(*) as count FROM addresses ${where}`)
      .get(...filterParams) as { count: number }
  ).count;

  const parsed = rows.map((row) => ({
    ...row,
    fields: JSON.parse(row.fields) as Record<string, string>,
  }));

  res.json({
    success: true,
    data: parsed,
    pagination: {
      page,
      limit,
      total,
      hasNextPage: offset + rows.length < total,
    },
  });
});

// GET /api/addresses/:id — single address by id
router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, errors: { message: "Invalid ID" } });
    return;
  }

  const row = db.prepare("SELECT * FROM addresses WHERE id = ?").get(id) as
    | {
        id: number;
        country_code: string;
        fields: string;
        created_at: string;
      }
    | undefined;

  if (!row) {
    res
      .status(404)
      .json({ success: false, errors: { message: "Address not found" } });
    return;
  }

  res.json({ success: true, data: { ...row, fields: JSON.parse(row.fields) } });
});

export default router;
