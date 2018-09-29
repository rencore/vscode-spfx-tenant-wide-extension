import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
const uuidv4 = require('uuid/v4');
import { Solution, Feature } from '../model';
import { TextDocument } from 'vscode';
const stripJsonComments = require('strip-json-comments');

export function addDeploymentInfo(fileUri: vscode.Uri): void {
  if (path.extname(fileUri.fsPath) !== '.json') {
    vscode.window.showErrorMessage(`File '${path.basename(fileUri.path)}' is not a SharePoint Framework component manifest`);
    return;
  }

  const workspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.getWorkspaceFolder(fileUri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage(`Couldn't determine workspace folder for the currently selected file`);
    return;
  }

  const workspaceFolderPath: string = workspaceFolder.uri.fsPath;
  let manifest: {
    id?: string;
    alias?: string;
    componentType?: string;
    extensionType?: string;
  };
  let packageSolutionDocument: vscode.TextDocument;
  let packageSolutionUri: vscode.Uri;
  let packageSolution: {
    solution?: Solution;
  };
  let packageSolutionString: string;
  let componentName: string;

  vscode.workspace
    .findFiles('config/package-solution.json', '**/node_modules/**', 1)
    .then((files: vscode.Uri[]): Thenable<TextDocument> => {
      if (files.length < 1) {
        return Promise.reject(`config/package-solution.json not found`);
      }

      packageSolutionUri = files[0];
      return vscode.workspace.openTextDocument(packageSolutionUri);
    })
    .then((textDocument: vscode.TextDocument): Thenable<vscode.Uri[]> => {
      packageSolutionDocument = textDocument;

      // check if tenant-wide deployment is enabled
      packageSolutionString = packageSolutionDocument.getText();

      try {
        packageSolution = JSON.parse(stripJsonComments(packageSolutionString));
      }
      catch (e) {
        return Promise.reject(`The following error has occurred while parsing the contents of the package-solution.json file: ${e}`);
      }
      if (!packageSolution.solution ||
        !packageSolution.solution.skipFeatureDeployment) {
        return Promise.reject(`Tenant-wide deployment is not enabled for this solution. Enable it in package-solution.json by setting the 'skipFeatureDeployment' property to 'true' and try again.`);
      }

      const manifestString: string = fs.readFileSync(fileUri.fsPath, 'utf-8');

      try {
        manifest = JSON.parse(stripJsonComments(manifestString));
      }
      catch (e) {
        return Promise.reject(`The following error has occurred while parsing the contents of the manifest file '${path.basename(fileUri.path)}': ${e}`);
      }

      if (manifest.componentType !== 'Extension') {
        return Promise.reject(`Selected manifest file is not an extension`);
      }

      if (manifest.extensionType !== 'ApplicationCustomizer' &&
        manifest.extensionType !== 'ListViewCommandSet') {
        return Promise.reject(`${manifest.extensionType} is not a supported extension type. Only ApplicationCustomizer and ListViewCommandSet are supported`);
      }

      if (!manifest.id) {
        return Promise.reject(`Selected manifest doesn't contain component id. Specify the id property and try again`);
      }

      componentName = manifest.alias || manifest.id;

      // check if the selected manifest already has a ClientSideComponentInstance registered
      return vscode.workspace.findFiles('sharepoint/assets/*.xml', '**/node_modules/**');
    })
    .then((xmlFiles: vscode.Uri[]): Thenable<boolean> => {
      for (let i: number = 0; i < xmlFiles.length; i++) {
        const xmlFile: string = fs.readFileSync(xmlFiles[i].fsPath, 'utf-8');
        if (xmlFile.indexOf(`ComponentId="${manifest.id}"`) > -1 &&
          xmlFile.indexOf('<ClientSideComponentInstance') > -1) {
          return Promise.reject(`Tenant-wide deployment information for component ${manifest.id} already present in file ${vscode.workspace.asRelativePath(xmlFiles[i].fsPath)}`);
        }
      }

      // no information for the current component found
      // create ClientSiteComponentInstance
      const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
      let url :string = `file:///${path.join(workspaceFolderPath, 'sharepoint', 'assets', `${manifest.id}.xml`)}`;
      url = url.replace(/\\/g,'/');
      const clientSideComponentInstanceXml: vscode.Uri = vscode.Uri.parse(url);
      edit.createFile(clientSideComponentInstanceXml, { overwrite: true });
      edit.insert(clientSideComponentInstanceXml, new vscode.Position(0, 0), `<?xml version="1.0" encoding="utf-8"?>
<Elements xmlns="http://schemas.microsoft.com/sharepoint/">
    <ClientSideComponentInstance
        Title="${componentName}"
        Location="${(manifest.extensionType === 'ApplicationCustomizer' ? 'ClientSideExtension.ApplicationCustomizer' : 'ClientSideExtension.ListViewCommandSet')}"
        ComponentId="${manifest.id}"
        Properties=""
        ListTemplateId=""
        WebTemplateId=""
        Sequence="">
    </ClientSideComponentInstance>
</Elements>`);

      // add reference to the XML file in the solution feature
      if (!packageSolution.solution) {
        packageSolution.solution = {};
      }
      if (!packageSolution.solution.features) {
        packageSolution.solution.features = [];
      }
      // check if the XML file isn't already referenced by another feature
      for (let i: number = 0; i < packageSolution.solution.features.length; i++) {
        const feature: Feature = packageSolution.solution.features[i];
        if (!feature.assets ||
          !feature.assets.elementManifests ||
          feature.assets.elementManifests.length < 1) {
          continue;
        }

        if (feature.assets.elementManifests.indexOf(`${manifest.id}.xml`) > -1) {
          return Promise.reject(`Tenant-wide deployment information for extension ${manifest.id} already included in feature ${feature.title}`);
        }
      }

      // take the first feature or create a new one if none exists
      const feature: Feature = packageSolution.solution.features.length > 0 ? packageSolution.solution.features[0] : {
        title: `${componentName} - Deployment of custom action.`,
        description: 'Deploys a custom action with ClientSideComponentId association',
        id: uuidv4(),
        version: '1.0.0.0',
        assets: {
          elementManifests: []
        }
      };
      if (!feature.assets) {
        feature.assets = {};
      }
      if (!feature.assets.elementManifests) {
        feature.assets.elementManifests = [];
      }
      feature.assets.elementManifests.push(`${manifest.id}.xml`);

      // replace package-solution.json contents
      const fullRange: vscode.Range = new vscode.Range(
        packageSolutionDocument.positionAt(0),
        packageSolutionDocument.positionAt(packageSolutionString.length - 1)
      );
      edit.replace(packageSolutionUri, fullRange, JSON.stringify(packageSolution, null, 2));
      return vscode.workspace.applyEdit(edit);
    })
    .then((result: boolean): void => {
      if (result) {
        vscode.window.showInformationMessage(`Successfully added tenant-wide deployment information for component ${manifest.id}`);
      }
      else {
        vscode.window.showErrorMessage(`Adding tenant-wide deployment information for component ${manifest.id} failed`);
      }
    }, (error: any): void => {
      vscode.window.showErrorMessage(error);
    });
}
