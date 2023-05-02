"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

/** Find all companies (optional filter on searchFilters).
 *
 * searchFilters (all optional):
 * - name (case-insensitive, partial matches)
 * - minEmployees
 * - maxEmployees
 *
 * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
 * */



// static async findAll(searchParams = {}) {
//   const { name, minEmployees, maxEmployees } = searchParams;

//   let whereClause = [];
//   let queryValues = [];

//   if (name) {
//     queryValues.push(`%${name}%`);
//     whereClause.push(`name ILIKE $${queryValues.length}`);
//   }

//   if (minEmployees) {
//     queryValues.push(minEmployees);
//     whereClause.push(`num_employees >= $${queryValues.length}`);
//   }

//   if (maxEmployees) {
//     queryValues.push(maxEmployees);
//     whereClause.push(`num_employees <= $${queryValues.length}`);
//   }

//   console.log(queryValues, queryValues.length)
//   console.log(whereClause)
//   const whereClauseStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
//   const query = `
//     SELECT handle, name, num_employees, description, logo_url 
//     FROM companies 
//     ${whereClauseStr}
//   `;
//   const result = await db.query(query, queryValues); 

//   if (result.rows.length === 0) {
//     throw new NotFoundError(`No company found with the given parameters`);
//   }
  
//   return result.rows;
// }

static async findAll(searchParams = {}) {
  const { name, minEmployees, maxEmployees, handle } = searchParams;

  let whereClause = [];
  let queryValues = [];

  if (name) {
    queryValues.push(`%${name}%`);
    whereClause.push(`name ILIKE $${queryValues.length}`);
  }

  if (minEmployees) {
    queryValues.push(minEmployees);
    whereClause.push(`num_employees >= $${queryValues.length}`);
  }

  if (maxEmployees) {
    queryValues.push(maxEmployees);
    whereClause.push(`num_employees <= $${queryValues.length}`);
  }

  if (handle) {
    queryValues.push(handle);
    whereClause.push(`handle = $${queryValues.length}`);
  }

  const whereClauseStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
  const query = `
    SELECT handle, name, num_employees, description, logo_url 
    FROM companies 
    ${whereClauseStr}
  `;
  const result = await db.query(query, queryValues); 

  if (result.rows.length === 0) {
    throw new NotFoundError(`No company found with the given parameters`);
  }
  
  return result.rows;
}

/**
 * Find a company by its handle.
 *
 * Returns { handle, name, description, numEmployees, logoUrl, jobs: [ { id, title, salary, equity }, ... ] }.
 *
 * Throws NotFoundError if not found.
 **/

static async get(handle) {
  const result = await db.query(
    `SELECT handle, name, description, num_employees, logo_url,
            j.id, j.title, j.salary, j.equity
     FROM companies
     LEFT JOIN jobs j ON handle = j.company_handle
     WHERE handle = $1`,
    [handle]
  );

  const company = result.rows[0];
  if (!company) {
    const error = new Error(`No company: ${handle}`);
    error.status = 404;
    throw error;
  }

  return {
    handle: company.handle,
    name: company.name,
    description: company.description,
    num_employees: company.num_employees,
    logo_url: company.logo_url,
    jobs: result.rows
      .filter((r) => r.id !== null)
      .map((r) => ({
        id: r.id,
        title: r.title,
        salary: r.salary,
        equity: r.equity,
      })), 
  };
}



  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}

module.exports = Company;
