import request from "supertest";
import { prisma } from "../../src/config/prisma";
import app from "../../src/app";
import { hashPassword } from "../../src/utils/password";

describe("POST auth/login", () => {
  beforeAll(async () => {
    const password = await hashPassword("User@123");
    await prisma.user.create({
      data: {
        firstName: "user",
        email: "user1@mail.com",
        password,
        role: "USER",
        mailVerifiedAt: new Date(),
      },
    });
  });

  it("Invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test", password: "test" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.errors.length > 0);
  });

  it("Incorrect email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@mail.com", password: "User@123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("Incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user1@mail.com", password: "Test@123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("Login success", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user1@mail.com", password: "User@123" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("Validate token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "user1@mail.com", password: "User@123" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const userResponse = await request(app)
      .get("/api/auth/user")
      .set("Authorization", `Bearer ${response.body.data.accessToken}`);
    expect(userResponse.status).toBe(200);
  });

  it("Invalid token", async () => {
    const response = await request(app).get("/api/auth/user").set("Authorization", `Bearer 123`);
    expect(response.status).toBe(401);
  });

  it("Generate access token", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "user1@mail.com", password: "User@123" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    const response = await request(app)
      .post("/api/auth/refresh-token")
      .set("Cookie", [`refresh-token=${loginResponse.body.data.refreshToken}`]);
    expect(response.status).toBe(200);
  });

  it("Logout", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: "user1@mail.com", password: "User@123" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`refresh-token=${loginResponse.body.data.refreshToken}`]);
    expect(logoutResponse.status).toBe(200);

    // const userResponse = await request(app)
    //   .get("/api/auth/user")
    //   .set("Authorization", `Bearer ${response.body.data.accessToken}`);
    // expect(userResponse.status).toBe(401);
  });
});
