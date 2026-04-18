# Structurizr DSL cheatsheet — canonical patterns

The 95% of the DSL you will write for NONoise projects. Full reference at https://docs.structurizr.com/dsl. This file is not exhaustive — it covers the patterns the `c4-doc-writer` skill emits.

## Top-level shape

Every Structurizr DSL file is wrapped in a single `workspace { ... }` block. Inside, a `model` declares entities, and a `views` block declares which diagrams to render.

```dsl
workspace "ProjectName" "Short description of the project." {

    model {
        // actors, systems, containers, components, relationships
    }

    views {
        // systemLandscape, systemContext, container, component, dynamic, styles
    }
}
```

Keep quotes around the workspace name and description — the DSL allows unquoted identifiers but quoted strings are easier to read in diffs.

## People (Level 1 — Context)

```dsl
operator      = person "Operator"       "Handles day-to-day operations."
admin         = person "Administrator"  "Manages users, roles, and configurations."
endUser       = person "End User"       "Consumes the public-facing app."
```

The left side (`operator`) is the identifier used in relationships. The first string is the display name, the second is the description.

## Software systems (Level 1 — Context)

```dsl
mySystem = softwareSystem "Project Name" "The app we're building." {
    // containers go here
}

// External systems — same syntax, often with the "External" tag
paymentGw = softwareSystem "Payment Gateway" "Third-party payments." {
    tags "External"
}

emailProvider = softwareSystem "Email Provider" "Transactional email." {
    tags "External"
}
```

The `tags` block inside a system / container / component is how you attach styling (see "Styles" below).

## Containers (Level 2 — Container)

A container is a runtime-deployable unit: a webapp, a service, a database, a message broker.

```dsl
mySystem = softwareSystem "MySystem" {

    shell     = container "Shell"          "Angular 20 host"        "TypeScript, Angular"
    bff       = container "BFF"            "Backend-for-frontend"   "TypeScript, Node 22"
    msAuth    = container "ms-auth"        "Authentication service" ".NET 10"
    msOrders  = container "ms-orders"      "Order processing"       ".NET 10"
    db        = container "Postgres"       "Primary database"       "Postgres 16" {
        tags "Database"
    }
    queue     = container "RabbitMQ"       "Event broker"           "RabbitMQ 3.13" {
        tags "Queue"
    }
}
```

Argument order: `name`, `description`, `technology`. Any of them can be omitted but keep the order consistent.

## Components (Level 3 — Component)

Components live inside a container. Use when you need to show the internal structure of a service (layers, bounded contexts, modules).

```dsl
msAuth = container "ms-auth" "Auth service" ".NET 10" {
    apiController  = component "Api Controller"  "Handles HTTP"       "ASP.NET Core"
    authService    = component "Auth Service"    "Business rules"     "C# class"
    userRepo       = component "User Repository" "DB access"          "EF Core"
    tokenIssuer    = component "Token Issuer"    "JWT signing"        "C# class"

    apiController -> authService  "Calls"
    authService   -> userRepo     "Reads/writes users"
    authService   -> tokenIssuer  "Issues JWT"
}
```

Most NONoise projects skip Component-level views at first pass. Add them when the architect is specifically studying internal module design.

## Relationships

Declared inside `model { … }` using the `->` arrow. Can be declared at any level (person → system, container → container, component → component).

```dsl
// basic
operator -> shell "Uses"

// with protocol / technology
shell    -> bff      "JSON over HTTPS"  "HTTPS"
bff      -> msAuth   "gRPC service call" "gRPC"
msAuth   -> db       "Reads/writes"     "EF Core"

// cross-system
bff      -> emailProvider "Sends transactional emails" "HTTPS/SMTP"
```

Third argument (after description) is the technology/protocol label — optional but improves the diagram.

## Views

The `views` block declares which diagrams to render. The same model drives many views — that's Structurizr's main advantage over hand-drawn Mermaid.

```dsl
views {

    systemLandscape "landscape" {
        include *
        autoLayout lr
    }

    systemContext mySystem "context" {
        include *
        autoLayout
    }

    container mySystem "containers" {
        include *
        autoLayout
    }

    component msAuth "auth-internals" {
        include *
        autoLayout
    }

    // Dynamic view — shows a flow across containers
    dynamic mySystem "signup" "User signup flow" {
        operator -> shell     "1. Submits signup form"
        shell    -> bff       "2. POST /signup"
        bff      -> msAuth    "3. CreateUser"
        msAuth   -> db        "4. INSERT user"
        msAuth   -> emailProvider "5. Send welcome email"
    }

    styles {
        element "Person" {
            shape Person
            background #08427B
            color #ffffff
        }
        element "External" {
            background #999999
            color #ffffff
        }
        element "Database" {
            shape Cylinder
        }
        element "Queue" {
            shape Pipe
        }
    }
}
```

Notes:
- `include *` is the easy default; use `include <identifier>` when you want to scope a view to specific elements
- `autoLayout` can be `tb` (top-bottom, default), `lr` (left-right), `bt`, `rl` — pick what reads best
- Styles target tags — add a tag to the element and the style applies

## Deployment views (advanced — skip at first pass)

Rarely needed in a NONoise project's initial C4. If the user asks for "deploy topology" or "infra diagram", search https://docs.structurizr.com/dsl/deployment — do not pre-emptively emit a `deploymentEnvironment` block.

## Dynamic views — when to use

Dynamic views are great for:
- Sign-up / login flows
- Checkout / order placement
- Event propagation across services (e.g. "order-placed → pricing → inventory → shipping")

They are **not** sequence diagrams in the UML sense; they show the high-level hops between containers with a numbered order. For detailed sequence diagrams (method-level), use Mermaid `sequenceDiagram` outside Structurizr — trying to force the DSL to that level creates noise.

## Identifiers and naming

- Identifiers (left side of `=`) are `camelCase` by convention — `msAuth`, not `ms-auth` or `MsAuth`
- Display names in quotes can use any characters — spaces, dashes, dots
- Keep identifiers stable — they are used in relationships and renaming them is a noisy diff. Renaming the display name is cheap.

## Comments

```dsl
// single-line comment
/* multi-line
   comment */
```

Use comments sparingly — the DSL is already declarative. Reserve comments for "why", not "what".

## Common mistakes

1. **Forgetting `workspace { }`** — the file won't parse
2. **Declaring a container outside a softwareSystem** — valid but unusual; most container views need a system parent
3. **Using unquoted identifiers with dashes** — `ms-auth = container …` fails. Quote it or use camelCase: `msAuth = container "ms-auth" …`
4. **Redefining the same identifier** — DSL allows extending with `!extend` but a second `=` line throws. If you need to add relationships to an existing element, use the identifier directly: `msAuth -> db "Reads"`.
5. **Forgetting the `views` block** — the model alone won't render anything; the CLI needs at least one view declaration.
