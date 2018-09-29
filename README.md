# Rencore tenant-wide SPFx extension deployment information

[![Rencore logo](./assets/rencore.png)](https://rencore.com)

Easily add tenant-wide deployment information for your SPFx extension directly from Visual Studio Code.

![The add tenant-wide deployment information menu option highlighted in Visual Studio Code](./assets/tenant-wide-deployment-menu.png)

Starting from SharePoint Framework v1.6.0, developers can choose to deploy SharePoint Framework extensions globally across the whole tenant. This is done by including tenant-wide deployment information for each extension in the project. Unfortunately, the SharePoint Framework Yeoman generator only adds this information for the first extension created along with the project. Using the **Rencore tenant-wide SPFx extension deployment information** extension, you can add this information for any extension directly from Visual Studio Code.

1. Right-click on the manifest of the extension, for which you want to add tenant-wide deployment information

2. From the context menu, select the **Add tenant-wide deployment information** option

   ![The add tenant-wide deployment information menu option highlighted in Visual Studio Code](./assets/tenant-wide-deployment-menu.png)

3. The **Rencore tenant-wide SPFx extension deployment information** extension will generate an XML file with the tenant-wide deployment information and register it with the SharePoint Framework solution package.

   ![Tenant-wide deployment information in an XML file generated by the 'Rencore tenant-wide SPFx extension deployment information' extension](./assets/tenant-wide-deployment-xml.png)

   ![XML file with the tenant-wide deployment information referenced in the package-solution.json file](./assets/tenant-wide-deployment-json.png)

## Release Notes

### 1.0.2

Fixed bug in determining the file path of the XML file on Windows.

### 1.0.1

Fixed bug when the manifest file to process isn't open in the editor.

### 1.0.0

Initial release