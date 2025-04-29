# Help Them Discover You: Dependency-Driven System Architecture

## System Architecture Overview

This document provides a comprehensive visualization of the platform architecture with an emphasis on component dependencies and data flows. The architecture is designed to enable parallel development while maintaining clear dependencies between components.

## Core System Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WebApp["Web Application\n(React/TypeScript)"]
        MobileApp["Mobile Application\n(React Native)"]
        ThirdParty["Third-Party Apps\n(API Consumers)"]
    end

    subgraph API["API Gateway Layer"]
        GraphQL["GraphQL API"]
        REST["REST API"]
        WebSocket["WebSocket API"]
    end

    subgraph Services["Service Layer"]
        Auth["Authentication\nService"]
        Profile["Profile\nService"]
        Analytics["Analytics\nService"]
        Sharing["Sharing\nService"]
        Template["Template\nService"]
        Recommend["Recommendation\nService"]
    end

    subgraph DataProc["Data Processing Layer"]
        CVParser["CV Parser"]
        OCR["OCR Service"]
        DataAgg["Data\nAggregator"]
        NLP["NLP Service"]
        Inference["Inference\nEngine"]
        MLModel["ML Model\nService"]
    end

    subgraph Storage["Storage Layer"]
        RDBMS["Relational DB\n(PostgreSQL)"]
        DocDB["Document DB\n(MongoDB)"]
        ObjStore["Object Storage\n(S3)"]
        Cache["Cache\n(Redis)"]
        Search["Search Index\n(Elasticsearch)"]
        TimeSeries["Time Series DB\n(InfluxDB)"]
    end

    subgraph Integration["Integration Layer"]
        SocialMedia["Social Media\nConnectors"]
        ATS["ATS\nConnectors"]
        HRMS["HRMS\nConnectors"]
    end

    %% Client to API connections
    WebApp --> GraphQL
    WebApp --> REST
    WebApp --> WebSocket
    MobileApp --> GraphQL
    MobileApp --> REST
    ThirdParty --> GraphQL
    ThirdParty --> REST

    %% API to Services connections
    GraphQL --> Auth
    GraphQL --> Profile
    GraphQL --> Analytics
    GraphQL --> Sharing
    GraphQL --> Template
    GraphQL --> Recommend

    REST --> Auth
    REST --> Profile
    REST --> Sharing
    
    WebSocket --> Sharing
    WebSocket --> Recommend

    %% Services to Data Processing connections
    Profile --> CVParser
    Profile --> DataAgg
    Analytics --> NLP
    Analytics --> Inference
    Analytics --> MLModel
    Recommend --> Inference
    Recommend --> MLModel

    %% Data Processing interconnections
    CVParser --> OCR
    CVParser --> NLP
    DataAgg --> NLP
    Inference --> MLModel

    %% Services to Storage connections
    Auth --> RDBMS
    Auth --> Cache
    Profile --> RDBMS
    Profile --> DocDB
    Profile --> ObjStore
    Profile --> Search
    Analytics --> DocDB
    Analytics --> TimeSeries
    Sharing --> RDBMS
    Sharing --> Cache
    Template --> DocDB
    Template --> ObjStore
    Recommend --> RDBMS
    Recommend --> DocDB

    %% Integration connections
    SocialMedia --> DataAgg
    ATS --> DataAgg
    HRMS --> DataAgg
    DataAgg --> DocDB
    
    %% Define dependency classifications with styles
    classDef criticalPath fill:#f9a,stroke:#333,stroke-width:2px
    classDef highDependency fill:#adf,stroke:#333,stroke-width:1px
    classDef mediumDependency fill:#fea,stroke:#333,stroke-width:1px
    classDef lowDependency fill:#afa,stroke:#333,stroke-width:1px
    
    %% Assign classes to nodes
    class Auth,Profile,CVParser,RDBMS,DocDB criticalPath
    class GraphQL,REST,DataAgg,Template,Sharing highDependency
    class Analytics,Recommend,NLP,Inference mediumDependency
    class WebSocket,OCR,MLModel,ObjStore,Cache,Search,TimeSeries,SocialMedia,ATS,HRMS lowDependency
```

## Component Dependency Matrix

The following matrix illustrates the dependencies between major system components, helping to identify critical path elements and prioritize development.

```mermaid
graph TD
    classDef primary fill:#f9a,stroke:#333,stroke-width:2px
    classDef secondary fill:#adf,stroke:#333,stroke-width:1px
    classDef tertiary fill:#afa,stroke:#333,stroke-width:1px

    %% Primary components (critical path)
    A[Authentication Service] :::primary
    P[Profile Service] :::primary
    C[CV Parser] :::primary
    D[Database Core Schema] :::primary
    
    %% Secondary components
    API[API Layer] :::secondary
    T[Template Service] :::secondary
    S[Sharing Service] :::secondary
    DA[Data Aggregator] :::secondary
    U[UI Component Library] :::secondary
    
    %% Tertiary components
    AN[Analytics Service] :::tertiary
    R[Recommendation Service] :::tertiary
    N[NLP Service] :::tertiary
    ML[ML Model Service] :::tertiary
    I[Integration Connectors] :::tertiary
    
    %% Dependencies between components
    D --> A
    D --> P
    P --> C
    A --> API
    P --> API
    P --> T
    P --> S
    C --> DA
    API --> U
    
    DA --> N
    DA --> AN
    AN --> ML
    AN --> R
    N --> ML
    P --> I
    
    %% Legend
    L1[Critical Path Components] :::primary
    L2[High Dependency Components] :::secondary
    L3[Lower Dependency Components] :::tertiary
```

## Data Flow Architecture

```mermaid
flowchart TD
    subgraph Input["Input Sources"]
        CV["CV Document"]
        Social["Social Media Data"]
        UserInput["User Manual Input"]
        API["External API Data"]
    end
    
    subgraph Processing["Processing Pipeline"]
        Parse["Document Parsing"]
        Extract["Data Extraction"]
        Transform["Data Transformation"]
        Normalize["Data Normalization"]
        Enrich["Data Enrichment"]
        Infer["Data Inference"]
    end
    
    subgraph Storage["Data Storage"]
        Raw["Raw Data Store"]
        Processed["Processed Data Store"]
        Analytical["Analytical Data Store"]
        Temp["Temporary Cache"]
    end
    
    subgraph Output["Output Systems"]
        Profile["Profile Visualization"]
        Analytics["Analytical Insights"]
        Templates["Custom Templates"]
        Export["Data Export"]
    end
    
    %% Input to Processing flows
    CV --> Parse
    Social --> Extract
    UserInput --> Normalize
    API --> Transform
    
    %% Processing pipeline flows
    Parse --> Extract
    Extract --> Transform
    Transform --> Normalize
    Normalize --> Enrich
    Enrich --> Infer
    
    %% Processing to Storage flows
    Parse --> Raw
    Extract --> Raw
    Transform --> Processed
    Normalize --> Processed
    Enrich --> Analytical
    Infer --> Analytical
    
    %% Temp cache connections
    Extract -.-> Temp
    Transform -.-> Temp
    Temp -.-> Normalize
    
    %% Storage to Output flows
    Raw --> Export
    Processed --> Profile
    Processed --> Templates
    Analytical --> Analytics
    Analytical --> Profile
    
    %% Define styles for different components
    classDef input fill:#ffd, stroke:#333, stroke-width:1px
    classDef process fill:#dff, stroke:#333, stroke-width:1px
    classDef storage fill:#fdf, stroke:#333, stroke-width:1px
    classDef output fill:#dfd, stroke:#333, stroke-width:1px
    
    %% Apply styles to subgraphs
    class Input input
    class Processing process
    class Storage storage
    class Output output
```

## Deployment Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Browser["Browser"]
        Mobile["Mobile App"]
    end
    
    subgraph CloudFront["CDN (CloudFront)"]
        CDN["Content Delivery Network"]
    end
    
    subgraph LoadBalancer["Load Balancer Layer"]
        ALB["Application Load Balancer"]
    end
    
    subgraph ApiGateway["API Gateway Layer"]
        APIG["API Gateway"]
    end
    
    subgraph AppServers["Application Servers"]
        AppServer1["App Server 1"]
        AppServer2["App Server 2"]
        AppServerN["App Server N"]
    end
    
    subgraph Services["Containerized Services"]
        AuthSvc["Auth Service"]
        ProfileSvc["Profile Service"]
        TemplateSvc["Template Service"]
        ParserSvc["Parser Service"]
        NLPSvc["NLP Service"]
        AnalyticsSvc["Analytics Service"]
    end
    
    subgraph Database["Database Layer"]
        PrimaryDB["Primary Database"]
        ReadReplica1["Read Replica 1"]
        ReadReplica2["Read Replica 2"]
    end
    
    subgraph Cache["Cache Layer"]
        Redis["Redis Cluster"]
    end
    
    subgraph ObjectStorage["Object Storage"]
        S3["S3 Buckets"]
    end
    
    subgraph Search["Search Layer"]
        ES["Elasticsearch Cluster"]
    end
    
    subgraph Monitoring["Monitoring & Observability"]
        Prom["Prometheus"]
        Graf["Grafana"]
        Log["Log Aggregation"]
    end
    
    %% Connection flow
    Browser --> CDN
    Mobile --> APIG
    CDN --> ALB
    ALB --> AppServer1
    ALB --> AppServer2
    ALB --> AppServerN
    AppServer1 --> APIG
    AppServer2 --> APIG
    AppServerN --> APIG
    
    APIG --> AuthSvc
    APIG --> ProfileSvc
    APIG --> TemplateSvc
    APIG --> ParserSvc
    APIG --> NLPSvc
    APIG --> AnalyticsSvc
    
    AuthSvc --> PrimaryDB
    ProfileSvc --> PrimaryDB
    TemplateSvc --> PrimaryDB
    AnalyticsSvc --> PrimaryDB
    
    ProfileSvc --> ReadReplica1
    AnalyticsSvc --> ReadReplica1
    ProfileSvc --> ReadReplica2
    TemplateSvc --> ReadReplica2
    
    AuthSvc --> Redis
    ProfileSvc --> Redis
    
    ParserSvc --> S3
    ProfileSvc --> S3
    TemplateSvc --> S3
    
    ProfileSvc --> ES
    ParserSvc --> ES
    
    AppServer1 -.-> Prom
    AppServer2 -.-> Prom
    AppServerN -.-> Prom
    AuthSvc -.-> Prom
    ProfileSvc -.-> Prom
    TemplateSvc -.-> Prom
    ParserSvc -.-> Prom
    NLPSvc -.-> Prom
    AnalyticsSvc -.-> Prom
    
    Prom --> Graf
    AppServer1 -.-> Log
    AppServer2 -.-> Log
    AppServerN -.-> Log
    AuthSvc -.-> Log
    ProfileSvc -.-> Log
    TemplateSvc -.-> Log
    ParserSvc -.-> Log
    NLPSvc -.-> Log
    AnalyticsSvc -.-> Log
    
    %% Define styles for different layers
    classDef client fill:#e4f2fc, stroke:#3498db, stroke-width:1px
    classDef delivery fill:#f8e9fc, stroke:#9b59b6, stroke-width:1px
    classDef compute fill:#fcf3cf, stroke:#f1c40f, stroke-width:1px
    classDef service fill:#d4ffda, stroke:#2ecc71, stroke-width:1px
    classDef data fill:#fce8e0, stroke:#e74c3c, stroke-width:1px
    classDef monitor fill:#f3f4f6, stroke:#7f8c8d, stroke-width:1px
    
    %% Apply styles to subgraphs
    class Client client
    class CloudFront,LoadBalancer,ApiGateway delivery
    class AppServers compute
    class Services service
    class Database,Cache,ObjectStorage,Search data
    class Monitoring monitor
```

## Sequence Diagrams for Key Workflows

### CV Upload and Processing Sequence

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant API as API Gateway
    participant Profile as Profile Service
    participant Parser as CV Parser
    participant OCR as OCR Service
    participant NLP as NLP Service
    participant DB as Database
    participant Storage as Object Storage
    
    User->>WebApp: Upload CV Document
    WebApp->>API: POST /cv/upload
    API->>Profile: forwardUpload(file)
    Profile->>Storage: storeOriginalDocument(file)
    Storage-->>Profile: documentUrl
    Profile->>DB: createCVRecord(metadata)
    DB-->>Profile: cvId
    Profile->>Parser: parseDocument(documentUrl, cvId)
    
    alt PDF with text layer
        Parser->>Parser: extractText(pdf)
    else Scanned Document
        Parser->>OCR: performOCR(documentUrl)
        OCR-->>Parser: extractedText
    end
    
    Parser->>Parser: identifySections(text)
    Parser->>NLP: extractEntities(sections)
    NLP-->>Parser: structuredEntities
    Parser->>DB: storeParsedData(cvId, structuredData)
    DB-->>Parser: updateConfirmation
    Parser-->>Profile: parsingComplete(cvId)
    Profile-->>API: parsingStatus
    API-->>WebApp: parsing results
    WebApp-->>User: Display parsed CV data
    
    Note over Parser,NLP: Dependency: NLP service must<br>be available for entity extraction
    Note over Profile,DB: Dependency: Database schema<br>must be ready for CV storage
```

### Multi-Source Data Integration Sequence

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web Application
    participant API as API Gateway
    participant Profile as Profile Service
    participant Integration as Integration Service
    participant LinkedIn as LinkedIn Connector
    participant GitHub as GitHub Connector
    participant DataAgg as Data Aggregator
    participant DB as Database
    
    User->>WebApp: Connect LinkedIn Account
    WebApp->>API: POST /integrations/linkedin/connect
    API->>Integration: initiateOAuth(userId)
    Integration-->>API: authorizationUrl
    API-->>WebApp: redirectToAuth
    WebApp->>User: Redirect to LinkedIn OAuth
    User->>LinkedIn: Authorize Application
    LinkedIn->>Integration: OAuth Callback
    Integration->>LinkedIn: requestAccessToken(code)
    LinkedIn-->>Integration: accessToken
    Integration->>DB: storeAccessToken(userId, token)
    
    Integration->>LinkedIn: fetchUserProfile(token)
    LinkedIn-->>Integration: profileData
    Integration->>LinkedIn: fetchUserExperience(token)
    LinkedIn-->>Integration: experienceData
    Integration->>LinkedIn: fetchUserSkills(token)
    LinkedIn-->>Integration: skillsData
    
    Integration->>DataAgg: aggregateProfileData(sourceData)
    DataAgg->>DataAgg: normalizeData(sourceData)
    DataAgg->>DataAgg: matchExistingEntities(normalizedData)
    DataAgg->>DB: storeIntegratedData(userId, integratedData)
    DB-->>DataAgg: updateConfirmation
    DataAgg-->>Integration: aggregationComplete
    Integration-->>API: integrationStatus
    API-->>WebApp: integration results
    WebApp-->>User: Display integrated profile
    
    Note over Integration,LinkedIn: Dependency: OAuth flow<br>requires LinkedIn API keys
    Note over DataAgg,DB: Dependency: Data models for<br>integrated profiles must exist
```

This document serves as a blueprint for implementing a dependency-driven development approach, highlighting the relationships between components, data flows, and deployment considerations. The diagrams provide a clear visual representation of the system architecture, helping development teams understand dependencies and coordinate their efforts effectively.