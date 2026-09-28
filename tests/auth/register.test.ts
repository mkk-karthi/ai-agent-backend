import request from "supertest";
import app from "../../src/app";

describe("POST auth/register", () => {
  it("Invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "test", password: "test", confirmPassword: "123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.length > 0);
  });

  it("Register User", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@mail.com", password: "User@123", confirmPassword: "User@123" });

    expect(response.status).toBe(201);
  });

  it("Register dupliacte email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "user@mail.com", password: "User@123", confirmPassword: "User@123" });

    expect(response.status).toBe(409);
  });
});
