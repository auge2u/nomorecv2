# System Architecture for NOMORECV Platform

## Overview
The system is designed using a microservices architecture to ensure scalability and maintainability.

## Components
1. **Frontend**: React.js application hosted on Azure Static Web Apps.
2. **Backend**: Node.js API hosted on Azure App Service.
3. **Database**: Azure Cosmos DB for NoSQL storage.
4. **Blockchain**: Ethereum-based smart contracts for verification.

## Diagram
![Architecture Diagram](../assets/architecture-diagram.png)

## Dependencies
- Azure Key Vault for secrets management.
- Azure Monitor for logging and diagnostics.