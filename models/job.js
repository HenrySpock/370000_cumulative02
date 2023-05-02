"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if companyHandle is not in db.
   **/

  static async create({ title, salary, equity, companyHandle }) {
    const companyCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [companyHandle]);
  
    if (!companyCheck.rows[0])
      throw new BadRequestError(`Company ${companyHandle} not found.`);
   
    const result = await db.query(
      `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [
        title,
        salary,
        equity, 
        companyHandle,
      ],
    );
    const job = result.rows[0];
  
    return job;
  }
  

  /** Find all jobs.
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */
  static async findAll(searchParams = {}) {
    const { title, minSalary, hasEquity } = searchParams;

    let whereClause = [];
    let queryValues = [];

    if (title) {
      queryValues.push(`%${title}%`);
      whereClause.push(`title ILIKE $${queryValues.length}`);
    }

    if (minSalary) {
      queryValues.push(minSalary);
      whereClause.push(`salary >= $${queryValues.length}`);
    }

    if (hasEquity) {
      whereClause.push(`equity > 0`);
    }

    const whereClauseStr = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';
    const query = `
      SELECT id, title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      ${whereClauseStr}
    `;
    const result = await db.query(query, queryValues); 

    console.log('Fetched jobs:', result.rows);

    if (result.rows.length === 0) {
      throw new NotFoundError(`No job found with the given parameters`);
    }
    
    return result.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, company }
   *   where company is { handle, name, description, numEmployees, logoUrl }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]
    );
  
    const job = jobRes.rows[0];
  
    if (!job) throw new NotFoundError(`No job: ${id}`);
  
    const companyRes = await db.query(
      `SELECT handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [job.companyHandle]
    );
  
    job.company = companyRes.rows[0];
  
    delete job.companyHandle;
  
    return job;
  }
  

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id, 
                                title, 
                                salary, 
                                equity, 
                                company_handle`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
 *
 * Throws NotFoundError if job not found.
 **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id`,
        [id]);
    const job = result.rows[0];
    console.log(id)
    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;