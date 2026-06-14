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

// GET /api/addresses — list saved addresses, optional ?country=USA filter
router.get("/", (req: Request, res: Response) => {
  const { country } = req.query;

  let rows: {
    id: number;
    country_code: string;
    fields: string;
    created_at: string;
  }[];

  if (country && typeof country === "string") {
    rows = db
      .prepare(
        "SELECT * FROM addresses WHERE country_code = ? ORDER BY id DESC",
      )
      .all(country) as typeof rows;
  } else {
    rows = db
      .prepare("SELECT * FROM addresses ORDER BY id DESC")
      .all() as typeof rows;
  }

  const parsed = rows.map((row) => ({
    ...row,
    fields: JSON.parse(row.fields) as Record<string, string>,
  }));

  res.json({ success: true, data: parsed });
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
