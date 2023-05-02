"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new",
    salary: 100000,
    equity: 0.5,
    companyHandle: "c1",
  };

  test("works", async function () {
    let job = await Job.create(newJob);

    job.equity = parseFloat(job.equity);

    expect(job).toEqual({ id: expect.any(Number), ...newJob });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'new'`);

    result.rows[0].equity = parseFloat(result.rows[0].equity);

    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "new",
        salary: 100000,
        equity: 0.5,
        companyHandle: "c1",
      },
    ]);
  });

  test("bad request with invalid companyHandle", async function () {
    try {
      await Job.create({ title: "new", salary: 100000, equity: "0.5", companyHandle: "nope" });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: returns all jobs", async function () {
    const res = await Job.findAll({});
      expect(res).toEqual([
        {
          id: expect.any(Number),
          title: "Job1",
          salary: 10000,
          equity: "0.1",
          companyHandle: "c1",
        },
        {
          id: expect.any(Number),
          title: "Job2",
          salary: 20000,
          equity: "0.2",
          companyHandle: "c2",
        },
        {
          id: expect.any(Number),
          title: "Job3",
          salary: 30000,
          equity: null,
          companyHandle: "c3",
        },
      ]);
    });
  });

  test("works: filters by title", async function () {
    const res = await Job.findAll({ title: "1" });
    expect(res).toEqual([
      {
        id: expect.any(Number),
        title: "Job1",
        salary: 10000,
        equity: "0.1",
        companyHandle: "c1",
      },
    ]);
  });

  test("works: filters by minSalary", async function () {
    const res = await Job.findAll({ minSalary: 20000 });
    expect(res).toEqual([
      {
        id: expect.any(Number),
        title: "Job2",
        salary: 20000,
        equity: "0.2",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: "Job3",
        salary: 30000,
        equity: null,
        companyHandle: "c3",
      },
    ]);
  });

  test("works: filters by hasEquity", async function () {
    const res = await Job.findAll({ hasEquity: true });
    expect(res).toEqual([
      {
        id: expect.any(Number),
        title: "Job1",
        salary: 10000,
        equity: "0.1",
        companyHandle: "c1",
      },
      {
        id: expect.any(Number),
        title: "Job2",
        salary: 20000,
        equity: "0.2",
        companyHandle: "c2",
      },
    ]); 
  });

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New",
    salary: 200000,
    equity: "0.2",
  };

  test("works", async function () {
    const job = await Job.create({
      title: "Job1",
      salary: 10000,
      equity: 0.1,
      companyHandle: "c1",
    });
    
    let updatedJob = await Job.update(job.id, updateData);
    
    expect(updatedJob).toEqual({
      id: job.id,
      company_handle: "c1",
      ...updateData,
    });
  
    const result = await db.query(
      `SELECT id, company_handle, title, salary, equity
       FROM jobs
       WHERE id = $1`, [job.id]);
    
    expect(result.rows).toEqual([{
      id: job.id,
      company_handle: "c1",
      title: "New",
      salary: 200000,
      equity: "0.2",
    }]);
  });

  test("updates job with null fields", async function () {
    const updateData = {
      salary: null,
      equity: null,
    };
    const job = await Job.create({
      title: "Job1",
      salary: 10000,
      equity: 0.1,
      companyHandle: "c1",
    });
    const updatedJob = await Job.update(job.id, updateData);
    expect(updatedJob).toEqual({
      id: job.id,
      company_handle: "c1",
      title: "Job1",
      salary: null,
      equity: null,
    });
  });
  
  test("not found if no such job", async function () {
    try {
      await Job.update(9999, { title: "New", salary: 200000, equity: "0.2" });
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
      expect(err.message).toEqual("No job: 9999");
    }
  }); 

  test("bad request with no data", async function () {
    try {
      await Job.update("Job1", {}); 
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
        "DELETE FROM jobs WHERE id=1 ");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(10000); 
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});