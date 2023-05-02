"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, authenticateJWT, ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login
 */

router.post("/", ensureLoggedIn, authenticateJWT, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 *
 * Can filter on provided search filters:
 * - minEmployees
 * - maxEmployees
 * - nameLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

function validateQuery(query) {
  const allowedFields = new Set(['name', 'minEmployees', 'maxEmployees']);
  const queryFields = Object.keys(query);

  for (const field of queryFields) {
    if (!allowedFields.has(field)) {
      return false;
    }
  }
  console.log("FILTERS VALDIATED")
  return true;
}

router.get('/', async function (req, res, next) {
  try { 
    if (!validateQuery(req.query)) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const filters = {
      name: req.query.name || null,
      minEmployees: req.query.minEmployees || null,
      maxEmployees: req.query.maxEmployees || null,
    };
    
    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push(`LOWER(name) LIKE LOWER($${params.length + 1})`);
      params.push(`%${filters.name}%`);
    }

    if (filters.minEmployees) {
      whereClauses.push(`num_employees >= $${params.length + 1}`);
      params.push(filters.minEmployees);
    }

    if (filters.maxEmployees) {
      whereClauses.push(`num_employees <= $${params.length + 1}`);
      params.push(filters.maxEmployees);
    }
    console.log("FILTERS: ", filters)
    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const queryStr = `SELECT * FROM companies ${whereStr}`;

    // Execute the query using your preferred database library.
    const companies = await Company.findAll({
      name: filters.name,
      minEmployees: filters.minEmployees,
      maxEmployees: filters.maxEmployees,
    });

    return res.json({ companies });

  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    console.log(company)
    return res.json({ company });

  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login
 */

router.patch("/:handle", ensureLoggedIn, authenticateJWT, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login
 */

router.delete("/:handle", ensureLoggedIn, authenticateJWT, ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
