import { User } from "../../../src/models";
import { isMobile } from "../../support/utils";

const apiGraphQL = `${Cypress.env("apiUrl")}/graphql`;

describe("User Sign-up and Login", function () {
  beforeEach(function () {
    cy.task("db:seed");
    cy.intercept("POST", "/users").as("signup");
    cy.intercept("POST", apiGraphQL, (req) => {
      const { body } = req;

      if (body.hasOwnProperty("operationName") && body.operationName === "CreateBankAccount") {
        req.alias = "gqlCreateBankAccountMutation";
      }
    });
  });

  it("should redirect unauthenticated user to signin page - attempt to see personal page", function () {
    cy.visit("/personal");
    cy.location("pathname").should("equal", "/signin");
    cy.visualSnapshot("Redirect to SignIn");
  });

  // Klara's test
  // try visiting /notifications page, which should only be seen by the authenticated users
  it("should redirect unauthenticated user to signin page - attempt to see notifications page", function () {
    cy.visit("/notifications");

    // debug: getting location content
    cy.location().then((loc) => {
      cy.task("log", loc);
    });

    cy.location("pathname").should("equal", "/signin");
    cy.visualSnapshot("Redirect to SignIn");
  });

  // Klara's test
  // try visiting /user/settings page, which should only be seen by the authenticated users
  it("should redirect unauthenticated user to signin page - attempt to see settings page", function () {
    cy.visit("/user/settings");
    cy.location("pathname").should("equal", "/signin");
    cy.visualSnapshot("Redirect to SignIn");
  });

  it("should redirect to the home page after login", function () {
    cy.database("find", "users").then((user: User) => {
      cy.login(user.username, "s3cret", { rememberUser: true });
    });
    cy.location("pathname").should("equal", "/");
  });

  // Klara's test
  // check that the user is redirected to the sign in page after logout
  it("should redirect to the signin page after logout", function () {
    cy.database("find", "users").then((user: User) => {
      cy.login(user.username, "s3cret", { rememberUser: false });
    });

    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();
    cy.location("pathname").should("equal", "/");
    cy.visualSnapshot("Redirect to SignIn");
  });

  // Klara's debug test for Typescript learning purposes
  // check how the request properties are printed out to Cypress log and terminal output
  it("print out request body after sign up", function () {
    cy.intercept("POST", "/users").as("yourPostRequest");

    const userInfo = {
      firstName: "Klara",
      lastName: "Test",
      username: "KlarasTestUser",
      password: "s3cret",
    };

    // Sign-up User
    cy.visit("/");

    cy.getBySel("signup").click();
    cy.getBySel("signup-title").should("be.visible").and("contain", "Sign Up");
    cy.visualSnapshot("Sign Up Title");

    cy.getBySel("signup-first-name").type(userInfo.firstName);
    cy.getBySel("signup-last-name").type(userInfo.lastName);
    cy.getBySel("signup-username").type(userInfo.username);
    cy.getBySel("signup-password").type(userInfo.password);
    cy.getBySel("signup-confirmPassword").type(userInfo.password);
    cy.visualSnapshot("About to Sign Up");
    cy.getBySel("signup-submit").click();

    // using different ways how to print out information about the intercepted request
    cy.wait("@yourPostRequest").then((obj) => {
      // request body object is not printed properly in cypress log and terminal, workaround for pretty print
      let prettyPrintRequestBody: string = JSON.stringify(obj.request.body);
      cy.log(prettyPrintRequestBody);

      cy.task("log", `This is the request body: ${prettyPrintRequestBody}`);
      cy.task("log", `This is the request method: ${obj.request.method}`);
      cy.task("log", `This is the resourceType: ${obj.request.resourceType}`);
      cy.task("log", `This is the request url: ${obj.request.url}`);
    });
  });

  it("should remember a user for 30 days after login", function () {
    cy.database("find", "users").then((user: User) => {
      cy.login(user.username, "s3cret", { rememberUser: true });
    });

    // Verify Session Cookie
    cy.getCookie("connect.sid").should("have.property", "expiry");

    //debug: getting cookie content
    cy.getCookie("connect.sid").then((cookie) => {
      cy.task("log", cookie);
    });

    // Logout User
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();
    cy.location("pathname").should("eq", "/signin");
    cy.visualSnapshot("Redirect to SignIn");
  });

  // Klara's test
  // check that the user cookie is null after sign in and sign out
  it("cookie should be null after sign out", function () {
    cy.database("find", "users").then((user: User) => {
      cy.login(user.username, "s3cret", { rememberUser: true });
    });

    // check that the session cookie is stored properly after log in
    cy.getCookie("connect.sid").should("have.property", "expiry");

    // log the user out
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();
    cy.location("pathname").should("eq", "/signin");
    cy.visualSnapshot("Redirect to SignIn");

    cy.getCookie("connect.sid").should("be.null");
  });

  it("should allow a visitor to sign-up, login, and logout", function () {
    const userInfo = {
      firstName: "Bob",
      lastName: "Ross",
      username: "PainterJoy90",
      password: "s3cret",
    };

    // Sign-up User
    cy.visit("/");

    cy.getBySel("signup").click();
    cy.getBySel("signup-title").should("be.visible").and("contain", "Sign Up");
    cy.visualSnapshot("Sign Up Title");

    cy.getBySel("signup-first-name").type(userInfo.firstName);
    cy.getBySel("signup-last-name").type(userInfo.lastName);
    cy.getBySel("signup-username").type(userInfo.username);
    cy.getBySel("signup-password").type(userInfo.password);
    cy.getBySel("signup-confirmPassword").type(userInfo.password);
    cy.visualSnapshot("About to Sign Up");
    cy.getBySel("signup-submit").click();
    cy.wait("@signup");

    // Login User
    cy.login(userInfo.username, userInfo.password);

    // Onboarding
    cy.getBySel("user-onboarding-dialog").should("be.visible");
    cy.getBySel("list-skeleton").should("not.exist");
    cy.getBySel("nav-top-notifications-count").should("exist");
    cy.visualSnapshot("User Onboarding Dialog");
    cy.getBySel("user-onboarding-next").click();

    cy.getBySel("user-onboarding-dialog-title").should("contain", "Create Bank Account");

    cy.getBySelLike("bankName-input").type("The Best Bank");
    cy.getBySelLike("accountNumber-input").type("123456789");
    cy.getBySelLike("routingNumber-input").type("987654321");
    cy.visualSnapshot("About to complete User Onboarding");
    cy.getBySelLike("submit").click();

    cy.wait("@gqlCreateBankAccountMutation");

    cy.getBySel("user-onboarding-dialog-title").should("contain", "Finished");
    cy.getBySel("user-onboarding-dialog-content").should("contain", "You're all set!");
    cy.visualSnapshot("Finished User Onboarding");
    cy.getBySel("user-onboarding-next").click();

    cy.getBySel("transaction-list").should("be.visible");
    cy.visualSnapshot("Transaction List is visible after User Onboarding");

    // Logout User
    if (isMobile()) {
      cy.getBySel("sidenav-toggle").click();
    }
    cy.getBySel("sidenav-signout").click();
    cy.location("pathname").should("eq", "/signin");
    cy.visualSnapshot("Redirect to SignIn");
  });

  it("should display login errors", function () {
    cy.visit("/");

    cy.getBySel("signin-username").type("User").find("input").clear().blur();
    cy.get("#username-helper-text").should("be.visible").and("contain", "Username is required");
    cy.visualSnapshot("Display Username is Required Error");

    cy.getBySel("signin-password").type("abc").find("input").blur();
    cy.get("#password-helper-text")
      .should("be.visible")
      .and("contain", "Password must contain at least 4 characters");
    cy.visualSnapshot("Display Password Error");

    cy.getBySel("signin-submit").should("be.disabled");
    cy.visualSnapshot("Sign In Submit Disabled");
  });

  it("should display signup errors", function () {
    cy.intercept("GET", "/signup");

    cy.visit("/signup");

    cy.getBySel("signup-first-name").type("First").find("input").clear().blur();
    cy.get("#firstName-helper-text").should("be.visible").and("contain", "First Name is required");

    cy.getBySel("signup-last-name").type("Last").find("input").clear().blur();
    cy.get("#lastName-helper-text").should("be.visible").and("contain", "Last Name is required");

    cy.getBySel("signup-username").type("User").find("input").clear().blur();
    cy.get("#username-helper-text").should("be.visible").and("contain", "Username is required");

    cy.getBySel("signup-password").type("password").find("input").clear().blur();
    cy.get("#password-helper-text").should("be.visible").and("contain", "Enter your password");

    cy.getBySel("signup-confirmPassword").type("DIFFERENT PASSWORD").find("input").blur();
    cy.get("#confirmPassword-helper-text")
      .should("be.visible")
      .and("contain", "Password does not match");
    cy.visualSnapshot("Display Sign Up Required Errors");

    cy.getBySel("signup-submit").should("be.disabled");
    cy.visualSnapshot("Sign Up Submit Disabled");
  });

  it("should error for an invalid user", function () {
    cy.login("invalidUserName", "invalidPa$$word");

    cy.getBySel("signin-error")
      .should("be.visible")
      .and("have.text", "Username or password is invalid");
    cy.visualSnapshot("Sign In, Invalid Username and Password, Username or Password is Invalid");
  });

  it("should error for an invalid password for existing user", function () {
    cy.database("find", "users").then((user: User) => {
      cy.login(user.username, "INVALID");
    });

    cy.getBySel("signin-error")
      .should("be.visible")
      .and("have.text", "Username or password is invalid");
    cy.visualSnapshot("Sign In, Invalid Username, Username or Password is Invalid");
  });
});
