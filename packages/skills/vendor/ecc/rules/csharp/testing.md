---
# Source: https://github.com/affaan-m/ECC/blob/b92f181b3b748d1abbc2afd94af6aa7d8c8fca29/rules/csharp/testing.md | Commit: b92f181b3b748d1abbc2afd94af6aa7d8c8fca29 | MIT | Adapted for NONoise; see UPSTREAM.md.
paths:
  - "**/*.cs"
  - "**/*.csx"
  - "**/*.csproj"
---
# C# Testing

> This file extends [common/testing.md](../common/testing.md) with C#-specific content.

## Test Framework

- Prefer **xUnit** for unit and integration tests
- Use **AwesomeAssertions** for readable assertions
- Use **Moq** or **NSubstitute** for mocking dependencies
- Use **Testcontainers** when integration tests need real infrastructure

## Test Organization

- Mirror `src/` structure under `tests/`
- Separate unit, integration, and end-to-end coverage clearly
- Name tests by behavior, not implementation details

```csharp
public sealed class OrderServiceTests
{
    [Fact]
    public async Task FindByIdAsync_ReturnsOrder_WhenOrderExists()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

## ASP.NET Core Integration Tests

- Use `WebApplicationFactory<TEntryPoint>` for API integration coverage
- Test auth, validation, and serialization through HTTP, not by bypassing middleware

## Coverage

- Target 80%+ line coverage
- Focus coverage on domain logic, validation, auth, and failure paths
- Run `dotnet test` in CI with coverage collection enabled where available
