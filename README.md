# Card Reader App Deployment Instructions

## Prerequisites
- Docker Desktop installed
- Azure CLI installed and configured
- Azure Subscription with permissions to create resources
- Access to Azure Container Registry (ACR)
- Access to Azure Web App Service

## Project Structure
```
├── app/
│   ├── app.py
│   ├── models.py
│   ├── requirements.txt
│   └── .env
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Step 1: Create the Database in Azure

1. Go to the **Azure Portal** at [https://portal.azure.com](https://portal.azure.com).
2. In the left sidebar, click **Create a resource**.
3. Search for **SQL Database** and select it.
4. Click **Create** to begin the database setup.

### Database Configuration:
- **Subscription:** Select your Azure subscription.
- **Resource Group:** Choose the existing resource group (`card-reader-group`).
- **Database Name:** Enter `admin_panel_db`.
- **Server:**
  - Click **Create new** and enter:
    - **Server name:** `admin-panel-server` (must be globally unique)
    - **Server admin login:** `sqladmin`
    - **Password:** `Card.1111` (or a secure password)
    - **Location:** `Sweden Central` (or your preferred region)
  - Click **OK** to create the server.
- **Compute + Storage:** Choose the **Basic** pricing tier for testing.
- **Networking:** Allow Azure services to access the server.

5. Click **Review + Create** and then **Create** to deploy the database.
6. Wait for the deployment to complete and then go to the database resource.

### Retrieve the Connection String:
1. Once the database is created, navigate to the database resource in the Azure portal.
2. Under **Settings**, select **Connection strings**.
3. Copy the ADO.NET connection string. It will look similar to:

```
Server=tcp:admin-panel-server.database.windows.net,1433;Database=admin_panel_db;User ID=sqladmin;Password=Card.1111;Encrypt=true;Connection Timeout=30;
```

4. Update the `.env` file in the `app/` directory with the retrieved connection string, formatted as:

```
DATABASE_URL='mssql+pyodbc://sqladmin:Card.1111@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server'
```

Ensure the link is correctly formatted and accessible before proceeding.

---


## Step 2: Build the Docker Image

### Open the Terminal and Navigate to the Project Directory:
1. Open **Docker Desktop** to ensure that Docker is running.

2. Open a terminal or command prompt and navigate to the project root directory where the `Dockerfile` and `docker-compose.yml` are located:

```bash
cd path/to/project/card-reader-app
```

3. Verify that Docker is running by executing:

```bash
docker --version
```

If Docker is not running, open **Docker Desktop** and start it.

### Build the Docker Image:
4. Run the following command to build the Docker image:

```bash
docker-compose build
```

- This command reads the `docker-compose.yml` file and executes the build process using the instructions in the `Dockerfile`.
- The resulting image will be named **card-reader-app** and tagged as **latest**.

### Verify the Build:
5. After the build completes, verify that the image was created successfully:

```bash
docker images
```

You should see an entry for `card-reader-app` with the `latest` tag.

### Common Issues and Solutions:
- If you encounter errors such as **module not found**, ensure that the `requirements.txt` file is correctly specified and that the paths are correct.
- If the `.env` file is not detected, ensure that it is located in the correct directory (`app/`).
- If the build fails due to missing dependencies, open the `Dockerfile` and confirm that all necessary libraries are installed.

```bash
docker-compose build
```

---

## Step 3: Push the Docker Image to Azure Container Registry (ACR)

### 1. Login to Azure:
Before pushing the image, you need to login to Azure.

```bash
az login
```

If you are already logged in, you can proceed to the next step.

### 2. Login to ACR:
You need to log in to the Azure Container Registry:

```bash
az acr login --name cardreaderregistry
```

If the login is successful, you will see:

```
Login Succeeded
```

### 3. Tag the Image:
The Docker image must be tagged with the ACR registry URL. Run the following command:

```bash
docker tag card-reader-app:latest cardreaderregistry.azurecr.io/card-reader-app:v1.0
```

- `card-reader-app:latest` — Local image name and tag.
- `cardreaderregistry.azurecr.io/card-reader-app:v1.0` — Target registry and repository name.

### 4. Verify the Tag:
Ensure the tag has been successfully applied by listing the images:

```bash
docker images
```

You should see an entry for `cardreaderregistry.azurecr.io/card-reader-app:v1.0`.

### 5. Push the Image to ACR:
Now, push the tagged image to ACR:

```bash
docker push cardreaderregistry.azurecr.io/card-reader-app:v1.0
```

- This will upload the image to ACR and may take some time depending on the image size and internet speed.

### 6. Verify the Push in Azure:
1. Go to the Azure Portal.
2. Navigate to **Container Registry > cardreaderregistry > Repositories**.
3. Confirm that the repository `card-reader-app` is listed with the tag `v1.0`.

### 7. Common Issues and Solutions:
- **Unauthorized (401) Error:**
  - Ensure you are logged in using `az acr login --name cardreaderregistry`.

- **Tag Not Found:**
  - Verify that the tag command was executed correctly and that the image name matches.

- **Push Fails with Timeout:**
  - Check your internet connection or retry the push command.

---



## Step 4: Deploy the Web App on Azure

### 1. Go to Azure Portal
- Open [Azure Portal](https://portal.azure.com).
- In the left sidebar, click **Create a resource**.
- Search for **Web App** and click **Create**.

### 2. Configure the Web App
- **Subscription:** Select your Azure subscription.
- **Resource Group:** Select `card-reader-group`.
- **Name:** Enter a unique name for your web app (e.g., `bth-cardreader-app`).
- **Publish:** Select **Docker Container**.
- **Operating System:** Select **Linux**.
- **Region:** Select the same region as the ACR (`Sweden Central`).
- **App Service Plan:** Select the existing plan or create a new one with the Free (F1) tier.

### 3. Configure Container Settings
- Click **Next: Docker**.
- **Image Source:** Azure Container Registry.
- **Registry:** Select `cardreaderregistry`.
- **Image and Tag:**
  - **Repository:** `card-reader-app`
  - **Tag:** `v1.0`
- **Startup Command:** Leave it blank unless you have a specific startup command.

### 4. Configure Environment Variables
- Click **Next: Configuration**.
- Under **Application settings**, add the following environment variable:
  - **Name:** `DATABASE_URL`
  - **Value:** The connection string from the `.env` file, e.g.,

```
mssql+pyodbc://sqladmin:Card.1111@admin-panel-server.database.windows.net/admin_panel_db?driver=ODBC+Driver+17+for+SQL+Server
```

### 5. Review and Create
- Click **Review + Create**.
- Review all configurations and click **Create**.
- Wait for the deployment to complete.

### 6. Verify Deployment
- Once the deployment is complete, go to the **App Service Overview** page.
- Copy the **URL** (e.g., `https://bth-cardreader-app.azurewebsites.net`).
- Open the URL in a browser to verify the application is running.
- If you encounter a 404 error or application issues, check the logs using:

```bash
az webapp log tail --name bth-cardreader-app --resource-group card-reader-group
```



## Additional Notes

### Database Connection Issues
- Ensure that the `DATABASE_URL` environment variable is correctly configured in Azure Web App settings.
- Verify that the database server allows Azure services to connect. Go to **Azure SQL Database > Networking > Firewalls and Virtual Networks** and ensure that the option **Allow Azure services and resources to access this server** is enabled.
- If the connection fails, verify the connection string structure. A typical connection string for Azure SQL Database is:

```
mssql+pyodbc://sqladmin:YourPassword@server-name.database.windows.net/database-name?driver=ODBC+Driver+17+for+SQL+Server
```

- Ensure that the SQL Server admin credentials (`sqladmin` and password) are correct and that the user has appropriate access permissions to the database.

### Checking Azure App Service Logs
- To view real-time logs in Azure App Service, run the following command:

```bash
az webapp log tail --name <app-name> --resource-group <resource-group>
```

- Example:

```bash
az webapp log tail --name bth-cardreader-app --resource-group card-reader-group
```

- Alternatively, in the Azure Portal:
  - Go to **App Service > Monitoring > Log stream** to view real-time application logs.
  - Go to **App Service > Monitoring > Diagnose and solve problems** for diagnostic tools and error insights.

### Common Issues and Solutions
- **404 Not Found:** Ensure that the container is running and that the startup command is correctly set in the App Service Configuration.
- **500 Internal Server Error:** Check the application logs for error details. Common issues include missing environment variables or database connection errors.
- **Module Not Found:** Verify that the `requirements.txt` file is correctly defined and that the Docker image was rebuilt after any changes.

### Restarting the Web App
- If changes are made to the environment variables or configuration, restart the web app to apply the changes:

```bash
az webapp restart --name <app-name> --resource-group <resource-group>
```

### Cleanup and Maintenance
- To stop and remove all running containers locally:

```bash
docker-compose down
```

- To remove unused Docker images and containers:

```bash
docker system prune -a
```

- To delete resources in Azure (e.g., to avoid unexpected charges):

```bash
az group delete --name card-reader-group --no-wait --yes
```

Proceed with caution when deleting resources to avoid accidental data loss.
