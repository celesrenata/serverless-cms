import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct, IConstruct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface LambdaApiConstructProps {
  environment: string;
  contentTable: dynamodb.ITable;
  mediaTable: dynamodb.ITable;
  usersTable: dynamodb.ITable;
  settingsTable: dynamodb.ITable;
  pluginsTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  sectionsTable: dynamodb.ITable;
  mediaBucket: s3.Bucket;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  api: apigateway.RestApi;
  authorizer: apigateway.IAuthorizer;
  sesFromEmail: string;
  sesConfigurationSetName: string;
  mediaCdnUrl: string;
}

interface LambdaFunctionConfig {
  id: string;
  nameSuffix: string;
  handler: string;
  codePath: string;
  timeout?: number;
  memorySize?: number;
  extraEnv?: Record<string, string>;
  description?: string;
  logicalId: string;
  serviceRoleLogicalId?: string;
  defaultPolicyLogicalId?: string;
}

export class LambdaApiConstruct extends Construct {
  public readonly schedulerFunction: lambda.Function;
  public readonly allFunctions: Map<string, lambda.Function> = new Map();
  public readonly sharedLayer: lambda.LayerVersion;

  private readonly props: LambdaApiConstructProps;
  private readonly commonEnv: Record<string, string>;
  private readonly pendingPolicyOverrides: Map<lambda.Function, string> = new Map();

  constructor(scope: Construct, id: string, props: LambdaApiConstructProps) {
    super(scope, id);

    this.props = props;

    // Shared Lambda Layer
    this.sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/layer'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      description: 'Shared utilities for CMS Lambda functions',
    });
    preserveLogicalId(this.sharedLayer, 'SharedLayer27DFABF0');

    // Common environment variables
    this.commonEnv = {
      CONTENT_TABLE: props.contentTable.tableName,
      MEDIA_TABLE: props.mediaTable.tableName,
      USERS_TABLE: props.usersTable.tableName,
      SETTINGS_TABLE: props.settingsTable.tableName,
      PLUGINS_TABLE: props.pluginsTable.tableName,
      COMMENTS_TABLE: props.commentsTable.tableName,
      SECTIONS_TABLE: props.sectionsTable.tableName,
      MEDIA_BUCKET: props.mediaBucket.bucketName,
      MEDIA_CDN_URL: props.mediaCdnUrl,
      COGNITO_REGION: cdk.Stack.of(this).region,
      USER_POOL_ID: props.userPool.userPoolId,
      USER_POOL_CLIENT_ID: props.userPoolClient.userPoolClientId,
      ENVIRONMENT: props.environment,
      SES_FROM_EMAIL: props.sesFromEmail,
      SES_CONFIGURATION_SET: props.sesConfigurationSetName,
      SES_REGION: cdk.Stack.of(this).region,
    };

    // ─── Content Lambda Functions ───────────────────────────────────────
    const contentCreate = this.createFunction({
      id: 'ContentCreateFunction', nameSuffix: 'content-create',
      handler: 'create', codePath: 'lambda/content',
      logicalId: 'ContentCreateFunctionFB3AF7E6',
      serviceRoleLogicalId: 'ContentCreateFunctionServiceRole56A33F62',
      defaultPolicyLogicalId: 'ContentCreateFunctionServiceRoleDefaultPolicyD3C35F0D',
    });
    const contentGet = this.createFunction({
      id: 'ContentGetFunction', nameSuffix: 'content-get',
      handler: 'get', codePath: 'lambda/content',
      logicalId: 'ContentGetFunction0951B29C',
      serviceRoleLogicalId: 'ContentGetFunctionServiceRole1C945F06',
      defaultPolicyLogicalId: 'ContentGetFunctionServiceRoleDefaultPolicy735F6B85',
    });
    const contentList = this.createFunction({
      id: 'ContentListFunction', nameSuffix: 'content-list',
      handler: 'list', codePath: 'lambda/content',
      logicalId: 'ContentListFunctionDB46B79B',
      serviceRoleLogicalId: 'ContentListFunctionServiceRole961F5D99',
      defaultPolicyLogicalId: 'ContentListFunctionServiceRoleDefaultPolicy29AD72B4',
    });
    const contentUpdate = this.createFunction({
      id: 'ContentUpdateFunction', nameSuffix: 'content-update',
      handler: 'update', codePath: 'lambda/content',
      logicalId: 'ContentUpdateFunction675E2A12',
      serviceRoleLogicalId: 'ContentUpdateFunctionServiceRoleB2B2336B',
      defaultPolicyLogicalId: 'ContentUpdateFunctionServiceRoleDefaultPolicy069E926D',
    });
    const contentDelete = this.createFunction({
      id: 'ContentDeleteFunction', nameSuffix: 'content-delete',
      handler: 'delete', codePath: 'lambda/content',
      logicalId: 'ContentDeleteFunction51AE9D08',
      serviceRoleLogicalId: 'ContentDeleteFunctionServiceRole9A31BC8C',
      defaultPolicyLogicalId: 'ContentDeleteFunctionServiceRoleDefaultPolicyCF18DB5B',
    });

    // ─── Media Lambda Functions ─────────────────────────────────────────
    const mediaUpload = this.createFunction({
      id: 'MediaUploadFunction', nameSuffix: 'media-upload',
      handler: 'upload', codePath: 'lambda/media',
      timeout: 60, memorySize: 1024,
      logicalId: 'MediaUploadFunction290EA71A',
      serviceRoleLogicalId: 'MediaUploadFunctionServiceRoleCC22C504',
      defaultPolicyLogicalId: 'MediaUploadFunctionServiceRoleDefaultPolicy10030EB7',
    });
    const mediaGet = this.createFunction({
      id: 'MediaGetFunction', nameSuffix: 'media-get',
      handler: 'get', codePath: 'lambda/media',
      logicalId: 'MediaGetFunction102C4DFC',
      serviceRoleLogicalId: 'MediaGetFunctionServiceRole7D90BC8D',
      defaultPolicyLogicalId: 'MediaGetFunctionServiceRoleDefaultPolicy92D3540A',
    });
    const mediaList = this.createFunction({
      id: 'MediaListFunction', nameSuffix: 'media-list',
      handler: 'list', codePath: 'lambda/media',
      logicalId: 'MediaListFunction4FCCAB01',
      serviceRoleLogicalId: 'MediaListFunctionServiceRole9AFCB913',
      defaultPolicyLogicalId: 'MediaListFunctionServiceRoleDefaultPolicy5455F96B',
    });
    const mediaDelete = this.createFunction({
      id: 'MediaDeleteFunction', nameSuffix: 'media-delete',
      handler: 'delete', codePath: 'lambda/media',
      logicalId: 'MediaDeleteFunctionFEA25DE0',
      serviceRoleLogicalId: 'MediaDeleteFunctionServiceRole3B0DEC19',
      defaultPolicyLogicalId: 'MediaDeleteFunctionServiceRoleDefaultPolicyCF71AF8D',
    });

    // ─── User Lambda Functions ──────────────────────────────────────────
    const userGetMe = this.createFunction({
      id: 'UserGetMeFunction', nameSuffix: 'user-get-me',
      handler: 'get_me', codePath: 'lambda/users',
      logicalId: 'UserGetMeFunctionD6B5DD67',
      serviceRoleLogicalId: 'UserGetMeFunctionServiceRoleBAE1810E',
      defaultPolicyLogicalId: 'UserGetMeFunctionServiceRoleDefaultPolicyCEF4826F',
    });
    const userUpdateMe = this.createFunction({
      id: 'UserUpdateMeFunction', nameSuffix: 'user-update-me',
      handler: 'update_me', codePath: 'lambda/users',
      logicalId: 'UserUpdateMeFunction1BBE4568',
      serviceRoleLogicalId: 'UserUpdateMeFunctionServiceRoleFC768704',
      defaultPolicyLogicalId: 'UserUpdateMeFunctionServiceRoleDefaultPolicyC03CCBE1',
    });
    const userList = this.createFunction({
      id: 'UserListFunction', nameSuffix: 'user-list',
      handler: 'list', codePath: 'lambda/users',
      logicalId: 'UserListFunctionEC8E3907',
      serviceRoleLogicalId: 'UserListFunctionServiceRole5565142B',
      defaultPolicyLogicalId: 'UserListFunctionServiceRoleDefaultPolicy2B2EE246',
    });
    const userCreate = this.createFunction({
      id: 'UserCreateFunction', nameSuffix: 'user-create',
      handler: 'create', codePath: 'lambda/users',
      logicalId: 'UserCreateFunction23667E2B',
      serviceRoleLogicalId: 'UserCreateFunctionServiceRoleB4ECADEA',
      defaultPolicyLogicalId: 'UserCreateFunctionServiceRoleDefaultPolicyA1F134A0',
    });
    const userUpdate = this.createFunction({
      id: 'UserUpdateFunction', nameSuffix: 'user-update',
      handler: 'update', codePath: 'lambda/users',
      logicalId: 'UserUpdateFunction0C02E161',
      serviceRoleLogicalId: 'UserUpdateFunctionServiceRole4972CE6D',
      defaultPolicyLogicalId: 'UserUpdateFunctionServiceRoleDefaultPolicyAFBE8563',
    });
    const userDelete = this.createFunction({
      id: 'UserDeleteFunction', nameSuffix: 'user-delete',
      handler: 'delete', codePath: 'lambda/users',
      logicalId: 'UserDeleteFunctionF8E8252A',
      serviceRoleLogicalId: 'UserDeleteFunctionServiceRole34154FBE',
      defaultPolicyLogicalId: 'UserDeleteFunctionServiceRoleDefaultPolicy7CA3A5A8',
    });
    const userResetPassword = this.createFunction({
      id: 'UserResetPasswordFunction', nameSuffix: 'user-reset-password',
      handler: 'reset_password', codePath: 'lambda/users',
      logicalId: 'UserResetPasswordFunction3ED13732',
      serviceRoleLogicalId: 'UserResetPasswordFunctionServiceRole9C9E4B30',
      defaultPolicyLogicalId: 'UserResetPasswordFunctionServiceRoleDefaultPolicy6B34CC08',
    });

    // ─── Settings Lambda Functions ──────────────────────────────────────
    const settingsGet = this.createFunction({
      id: 'SettingsGetFunction', nameSuffix: 'settings-get',
      handler: 'get', codePath: 'lambda/settings',
      logicalId: 'SettingsGetFunction686DE50E',
      serviceRoleLogicalId: 'SettingsGetFunctionServiceRole7F191F43',
      defaultPolicyLogicalId: 'SettingsGetFunctionServiceRoleDefaultPolicy9E76353F',
    });
    const settingsUpdate = this.createFunction({
      id: 'SettingsUpdateFunction', nameSuffix: 'settings-update',
      handler: 'update', codePath: 'lambda/settings',
      logicalId: 'SettingsUpdateFunctionA3AFBF5A',
      serviceRoleLogicalId: 'SettingsUpdateFunctionServiceRoleEBB4AB0D',
      defaultPolicyLogicalId: 'SettingsUpdateFunctionServiceRoleDefaultPolicyD7F4BF02',
    });
    const settingsGetPublic = this.createFunction({
      id: 'SettingsGetPublicFunction', nameSuffix: 'settings-get-public',
      handler: 'get_public', codePath: 'lambda/settings',
      logicalId: 'SettingsGetPublicFunction191360CC',
      serviceRoleLogicalId: 'SettingsGetPublicFunctionServiceRoleECA6D555',
      defaultPolicyLogicalId: 'SettingsGetPublicFunctionServiceRoleDefaultPolicyC3DCEB2E',
    });

    // ─── Plugin Lambda Functions ────────────────────────────────────────
    const pluginInstall = this.createFunction({
      id: 'PluginInstallFunction', nameSuffix: 'plugin-install',
      handler: 'install', codePath: 'lambda/plugins',
      logicalId: 'PluginInstallFunctionF2861656',
      serviceRoleLogicalId: 'PluginInstallFunctionServiceRole4C8558E9',
      defaultPolicyLogicalId: 'PluginInstallFunctionServiceRoleDefaultPolicy135D9EBD',
    });
    const pluginActivate = this.createFunction({
      id: 'PluginActivateFunction', nameSuffix: 'plugin-activate',
      handler: 'activate', codePath: 'lambda/plugins',
      logicalId: 'PluginActivateFunctionA6ACF8C2',
      serviceRoleLogicalId: 'PluginActivateFunctionServiceRole4ABE723D',
      defaultPolicyLogicalId: 'PluginActivateFunctionServiceRoleDefaultPolicyCA7F4ACF',
    });
    const pluginDeactivate = this.createFunction({
      id: 'PluginDeactivateFunction', nameSuffix: 'plugin-deactivate',
      handler: 'deactivate', codePath: 'lambda/plugins',
      logicalId: 'PluginDeactivateFunction08F6104F',
      serviceRoleLogicalId: 'PluginDeactivateFunctionServiceRole1BB8488E',
      defaultPolicyLogicalId: 'PluginDeactivateFunctionServiceRoleDefaultPolicy1894A951',
    });
    const pluginList = this.createFunction({
      id: 'PluginListFunction', nameSuffix: 'plugin-list',
      handler: 'list', codePath: 'lambda/plugins',
      logicalId: 'PluginListFunctionBBE09B77',
      serviceRoleLogicalId: 'PluginListFunctionServiceRole10F3CBAF',
      defaultPolicyLogicalId: 'PluginListFunctionServiceRoleDefaultPolicyE2F52F1A',
    });
    const pluginGetSettings = this.createFunction({
      id: 'PluginGetSettingsFunction', nameSuffix: 'plugin-get-settings',
      handler: 'get_settings', codePath: 'lambda/plugins',
      logicalId: 'PluginGetSettingsFunctionB16EDA61',
      serviceRoleLogicalId: 'PluginGetSettingsFunctionServiceRole259D0F16',
      defaultPolicyLogicalId: 'PluginGetSettingsFunctionServiceRoleDefaultPolicyD293BCC3',
    });
    const pluginUpdateSettings = this.createFunction({
      id: 'PluginUpdateSettingsFunction', nameSuffix: 'plugin-update-settings',
      handler: 'update_settings', codePath: 'lambda/plugins',
      logicalId: 'PluginUpdateSettingsFunctionEAAB4980',
      serviceRoleLogicalId: 'PluginUpdateSettingsFunctionServiceRoleBB380169',
      defaultPolicyLogicalId: 'PluginUpdateSettingsFunctionServiceRoleDefaultPolicyE7A8F1B0',
    });

    // ─── Comment Lambda Functions ───────────────────────────────────────
    const commentList = this.createFunction({
      id: 'CommentListFunction', nameSuffix: 'comment-list',
      handler: 'list', codePath: 'lambda/comments',
      logicalId: 'CommentListFunctionF86387CA',
      serviceRoleLogicalId: 'CommentListFunctionServiceRole91BC6792',
      defaultPolicyLogicalId: 'CommentListFunctionServiceRoleDefaultPolicy13246EA1',
    });
    const commentCreate = this.createFunction({
      id: 'CommentCreateFunction', nameSuffix: 'comment-create',
      handler: 'create', codePath: 'lambda/comments',
      logicalId: 'CommentCreateFunctionAAAC6AA4',
      serviceRoleLogicalId: 'CommentCreateFunctionServiceRoleB2DA0D3A',
      defaultPolicyLogicalId: 'CommentCreateFunctionServiceRoleDefaultPolicyDE2D1CB7',
    });
    const commentUpdate = this.createFunction({
      id: 'CommentUpdateFunction', nameSuffix: 'comment-update',
      handler: 'update', codePath: 'lambda/comments',
      logicalId: 'CommentUpdateFunction861A218F',
      serviceRoleLogicalId: 'CommentUpdateFunctionServiceRole8C31742B',
      defaultPolicyLogicalId: 'CommentUpdateFunctionServiceRoleDefaultPolicyE41D5B7A',
    });
    const commentDelete = this.createFunction({
      id: 'CommentDeleteFunction', nameSuffix: 'comment-delete',
      handler: 'delete', codePath: 'lambda/comments',
      logicalId: 'CommentDeleteFunction213EACF6',
      serviceRoleLogicalId: 'CommentDeleteFunctionServiceRole0D2E072F',
      defaultPolicyLogicalId: 'CommentDeleteFunctionServiceRoleDefaultPolicyE68497E0',
    });

    // ─── Auth Lambda Functions ──────────────────────────────────────────
    const register = this.createFunction({
      id: 'RegisterFunction', nameSuffix: 'register',
      handler: 'register', codePath: 'lambda/auth',
      logicalId: 'RegisterFunction735506DF',
      serviceRoleLogicalId: 'RegisterFunctionServiceRoleDB8F6C89',
      defaultPolicyLogicalId: 'RegisterFunctionServiceRoleDefaultPolicyC4352E3C',
    });
    const verifyEmail = this.createFunction({
      id: 'VerifyEmailFunction', nameSuffix: 'verify-email',
      handler: 'verify_email', codePath: 'lambda/auth',
      logicalId: 'VerifyEmailFunction6AC00EBE',
      serviceRoleLogicalId: 'VerifyEmailFunctionServiceRole39E7B4E3',
      defaultPolicyLogicalId: 'VerifyEmailFunctionServiceRoleDefaultPolicy7444358B',
    });

    // ─── Section Lambda Functions ───────────────────────────────────────
    const sectionCreate = this.createFunction({
      id: 'SectionCreateFunction', nameSuffix: 'section-create',
      handler: 'create', codePath: 'lambda/sections',
      logicalId: 'SectionCreateFunction',
    });
    const sectionGet = this.createFunction({
      id: 'SectionGetFunction', nameSuffix: 'section-get',
      handler: 'get', codePath: 'lambda/sections',
      logicalId: 'SectionGetFunction',
    });
    const sectionUpdate = this.createFunction({
      id: 'SectionUpdateFunction', nameSuffix: 'section-update',
      handler: 'update', codePath: 'lambda/sections',
      logicalId: 'SectionUpdateFunction',
    });
    const sectionDelete = this.createFunction({
      id: 'SectionDeleteFunction', nameSuffix: 'section-delete',
      handler: 'delete', codePath: 'lambda/sections',
      logicalId: 'SectionDeleteFunction',
    });
    const sectionPublic = this.createFunction({
      id: 'SectionPublicFunction', nameSuffix: 'section-public',
      handler: 'public', codePath: 'lambda/sections',
      logicalId: 'SectionPublicFunction',
    });

    // ─── Scheduler Function (custom env, no shared layer) ───────────────
    this.schedulerFunction = new lambda.Function(this, 'SchedulerFunction', {
      functionName: `cms-scheduler-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'publish_scheduled.handler',
      code: lambda.Code.fromAsset('lambda/scheduler'),
      timeout: Duration.minutes(5),
      memorySize: 256,
      environment: {
        CONTENT_TABLE: props.contentTable.tableName,
        ENVIRONMENT: props.environment,
      },
      description: 'Publishes scheduled content when scheduled_at time is reached',
    });
    preserveLogicalId(this.schedulerFunction, 'SchedulerFunction9ED01671');
    // Preserve scheduler service role logical ID
    {
      const cfnRole = (this.schedulerFunction.role as iam.Role).node.defaultChild as cdk.CfnResource;
      if (cfnRole) cfnRole.overrideLogicalId('SchedulerFunctionServiceRoleC8A0647B');
    }
    this.allFunctions.set('Scheduler', this.schedulerFunction);
    // Store scheduler default policy for deferred override
    this.pendingPolicyOverrides.set(this.schedulerFunction, 'SchedulerFunctionServiceRoleDefaultPolicyA8621E37');

    props.contentTable.grantReadWriteData(this.schedulerFunction);

    // EventBridge Rule to trigger scheduler every 5 minutes
    const schedulerRule = new events.Rule(this, 'SchedulerRule', {
      ruleName: `cms-scheduler-rule-${props.environment}`,
      description: 'Triggers scheduler Lambda every 5 minutes to publish scheduled content',
      schedule: events.Schedule.rate(Duration.minutes(5)),
      enabled: true,
    });
    preserveLogicalId(schedulerRule, 'SchedulerRule4596AC40');
    schedulerRule.addTarget(new targets.LambdaFunction(this.schedulerFunction, {
      retryAttempts: 2,
    }));
    // Preserve the EventBridge -> Lambda permission logical ID using Aspects
    cdk.Aspects.of(this).add({
      visit(node: IConstruct) {
        if (node instanceof lambda.CfnPermission) {
          const currentId = cdk.Stack.of(node).getLogicalId(node);
          if (currentId.includes('SchedulerRule') && currentId.includes('AllowEventRule')) {
            node.overrideLogicalId('SchedulerRuleAllowEventRuleServerlessCmsStackdevSchedulerFunction56679AE80E17D45F');
          }
        }
      },
    });

    // ─── IAM Permissions ────────────────────────────────────────────────

    // Content function permissions
    [contentCreate, contentGet, contentList, contentUpdate, contentDelete].forEach((fn) =>
      props.contentTable.grantReadWriteData(fn),
    );
    [contentCreate, contentGet, contentList].forEach((fn) =>
      this.grantDynamoDbIndexQuery(fn, props.contentTable),
    );
    [contentCreate, contentGet, contentUpdate, contentDelete].forEach((fn) =>
      props.pluginsTable.grantReadData(fn),
    );
    props.usersTable.grantReadWriteData(contentCreate);
    [contentGet, contentList, contentUpdate, contentDelete].forEach((fn) =>
      props.usersTable.grantReadData(fn),
    );
    this.grantCognito(contentCreate, ['cognito-idp:AdminGetUser']);

    // Media function permissions
    [mediaUpload, mediaDelete].forEach((fn) => props.mediaTable.grantReadWriteData(fn));
    [mediaGet, mediaList].forEach((fn) => props.mediaTable.grantReadData(fn));
    props.mediaBucket.grantReadWrite(mediaUpload);
    props.mediaBucket.grantRead(mediaGet);
    props.mediaBucket.grantDelete(mediaDelete);
    [mediaUpload, mediaDelete].forEach((fn) => {
      props.pluginsTable.grantReadData(fn);
      props.usersTable.grantReadData(fn);
    });

    // User function permissions
    [userGetMe, userUpdateMe, userCreate, userUpdate, userDelete].forEach((fn) =>
      props.usersTable.grantReadWriteData(fn),
    );
    [userList, userResetPassword].forEach((fn) => props.usersTable.grantReadData(fn));
    this.grantCognito(userGetMe, ['cognito-idp:AdminGetUser']);
    this.grantCognito(userUpdateMe, [
      'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes',
    ]);
    this.grantCognito(userCreate, [
      'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminUpdateUserAttributes',
    ]);
    this.grantCognito(userUpdate, [
      'cognito-idp:AdminGetUser', 'cognito-idp:AdminUpdateUserAttributes',
    ]);
    this.grantCognito(userDelete, [
      'cognito-idp:AdminGetUser', 'cognito-idp:AdminDeleteUser',
    ]);
    this.grantCognito(userResetPassword, [
      'cognito-idp:AdminGetUser', 'cognito-idp:AdminResetUserPassword',
    ]);

    // Settings function permissions
    [settingsGet, settingsGetPublic].forEach((fn) => props.settingsTable.grantReadData(fn));
    props.settingsTable.grantReadWriteData(settingsUpdate);
    [settingsGet, settingsUpdate].forEach((fn) => props.usersTable.grantReadData(fn));

    // Plugin function permissions
    [pluginInstall, pluginActivate, pluginDeactivate].forEach((fn) =>
      props.pluginsTable.grantReadWriteData(fn),
    );
    [pluginList, pluginGetSettings].forEach((fn) => props.pluginsTable.grantReadData(fn));
    props.pluginsTable.grantReadWriteData(pluginUpdateSettings);
    props.settingsTable.grantReadData(pluginGetSettings);
    props.settingsTable.grantReadWriteData(pluginUpdateSettings);
    // All plugin functions need users table read access for auth role lookup
    [pluginInstall, pluginActivate, pluginDeactivate, pluginList, pluginGetSettings, pluginUpdateSettings].forEach(
      (fn) => props.usersTable.grantReadData(fn),
    );

    // Comment function permissions
    props.commentsTable.grantReadData(commentList);
    [commentCreate, commentUpdate, commentDelete].forEach((fn) =>
      props.commentsTable.grantReadWriteData(fn),
    );
    this.grantDynamoDbIndexQuery(commentList, props.commentsTable);
    props.contentTable.grantReadData(commentCreate);
    [commentCreate, commentList, commentUpdate, commentDelete].forEach((fn) =>
      props.settingsTable.grantReadData(fn),
    );
    [commentUpdate, commentDelete].forEach((fn) => props.usersTable.grantReadData(fn));

    // Auth function permissions
    props.usersTable.grantReadWriteData(register);
    props.usersTable.grantReadData(verifyEmail);
    this.grantCognito(register, [
      'cognito-idp:AdminCreateUser', 'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminUpdateUserAttributes', 'cognito-idp:ListUsers',
    ]);
    this.grantCognito(verifyEmail, [
      'cognito-idp:AdminConfirmSignUp', 'cognito-idp:AdminUpdateUserAttributes',
    ]);

    // SES send email permissions
    [userCreate, userResetPassword, register].forEach((fn) => this.grantSesSendEmail(fn));

    // CloudWatch PutMetricData permissions
    [commentCreate, commentUpdate, userCreate, register].forEach((fn) =>
      this.grantCloudWatchPutMetricData(fn),
    );

    // Section function permissions
    [sectionCreate, sectionGet, sectionUpdate, sectionDelete, sectionPublic].forEach((fn) =>
      props.sectionsTable.grantReadWriteData(fn),
    );
    [sectionCreate, sectionGet, sectionUpdate, sectionDelete, sectionPublic].forEach((fn) =>
      props.contentTable.grantReadData(fn),
    );
    [sectionCreate, sectionGet, sectionUpdate, sectionDelete, sectionPublic].forEach((fn) =>
      this.grantDynamoDbIndexQuery(fn, props.sectionsTable),
    );
    [sectionPublic].forEach((fn) =>
      this.grantDynamoDbIndexQuery(fn, props.contentTable),
    );
    [sectionCreate, sectionUpdate, sectionDelete].forEach((fn) =>
      props.usersTable.grantReadData(fn),
    );

    // ─── API Gateway Routes ─────────────────────────────────────────────
    const apiV1 = props.api.root.addResource('api').addResource('v1');

    // Content endpoints: /api/v1/content
    const contentResource = apiV1.addResource('content');
    contentResource.addMethod('POST', new apigateway.LambdaIntegration(contentCreate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentResource.addMethod('GET', new apigateway.LambdaIntegration(contentList));

    const contentIdResource = contentResource.addResource('{id}');
    contentIdResource.addMethod('GET', new apigateway.LambdaIntegration(contentGet));
    contentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(contentUpdate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    contentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(contentDelete), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const contentSlugResource = contentResource.addResource('slug').addResource('{slug}');
    contentSlugResource.addMethod('GET', new apigateway.LambdaIntegration(contentGet));

    // Media endpoints: /api/v1/media
    const mediaResource = apiV1.addResource('media');
    mediaResource.addMethod('GET', new apigateway.LambdaIntegration(mediaList), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const mediaUploadResource = mediaResource.addResource('upload');
    mediaUploadResource.addMethod('POST', new apigateway.LambdaIntegration(mediaUpload), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const mediaIdResource = mediaResource.addResource('{id}');
    mediaIdResource.addMethod('GET', new apigateway.LambdaIntegration(mediaGet), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    mediaIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(mediaDelete), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // User endpoints: /api/v1/users
    const usersResource = apiV1.addResource('users');
    usersResource.addMethod('GET', new apigateway.LambdaIntegration(userList), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(userCreate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const usersMeResource = usersResource.addResource('me');
    usersMeResource.addMethod('GET', new apigateway.LambdaIntegration(userGetMe), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    usersMeResource.addMethod('PUT', new apigateway.LambdaIntegration(userUpdateMe), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const userIdResource = usersResource.addResource('{id}');
    userIdResource.addMethod('PUT', new apigateway.LambdaIntegration(userUpdate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    userIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(userDelete), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const userResetPasswordResource = userIdResource.addResource('reset-password');
    userResetPasswordResource.addMethod('POST', new apigateway.LambdaIntegration(userResetPassword), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Settings endpoints: /api/v1/settings
    const settingsResource = apiV1.addResource('settings');
    settingsResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGet), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    settingsResource.addMethod('PUT', new apigateway.LambdaIntegration(settingsUpdate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const settingsPublicResource = settingsResource.addResource('public');
    settingsPublicResource.addMethod('GET', new apigateway.LambdaIntegration(settingsGetPublic));

    // Plugin endpoints: /api/v1/plugins
    const pluginsResource = apiV1.addResource('plugins');
    pluginsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginList), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginInstallResource = pluginsResource.addResource('install');
    pluginInstallResource.addMethod('POST', new apigateway.LambdaIntegration(pluginInstall), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginIdResource = pluginsResource.addResource('{id}');
    const pluginActivateResource = pluginIdResource.addResource('activate');
    pluginActivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginActivate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginDeactivateResource = pluginIdResource.addResource('deactivate');
    pluginDeactivateResource.addMethod('POST', new apigateway.LambdaIntegration(pluginDeactivate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const pluginSettingsResource = pluginIdResource.addResource('settings');
    pluginSettingsResource.addMethod('GET', new apigateway.LambdaIntegration(pluginGetSettings), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    pluginSettingsResource.addMethod('PUT', new apigateway.LambdaIntegration(pluginUpdateSettings), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Comment endpoints: /api/v1/content/{id}/comments
    const contentCommentsResource = contentIdResource.addResource('comments');
    contentCommentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentList));
    contentCommentsResource.addMethod('POST', new apigateway.LambdaIntegration(commentCreate));

    // Comment moderation endpoints: /api/v1/comments
    const commentsResource = apiV1.addResource('comments');
    commentsResource.addMethod('GET', new apigateway.LambdaIntegration(commentList), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const commentIdResource = commentsResource.addResource('{id}');
    commentIdResource.addMethod('PUT', new apigateway.LambdaIntegration(commentUpdate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    commentIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(commentDelete), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Auth endpoints: /api/v1/auth
    const authResource = apiV1.addResource('auth');
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', new apigateway.LambdaIntegration(register));

    const verifyEmailResource = authResource.addResource('verify-email');
    verifyEmailResource.addMethod('POST', new apigateway.LambdaIntegration(verifyEmail));

    // Section endpoints: /api/v1/sections (authenticated)
    const sectionsResource = apiV1.addResource('sections');
    sectionsResource.addMethod('POST', new apigateway.LambdaIntegration(sectionCreate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionsResource.addMethod('GET', new apigateway.LambdaIntegration(sectionGet), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    const sectionIdResource = sectionsResource.addResource('{id}');
    sectionIdResource.addMethod('GET', new apigateway.LambdaIntegration(sectionGet), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionIdResource.addMethod('PUT', new apigateway.LambdaIntegration(sectionUpdate), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });
    sectionIdResource.addMethod('DELETE', new apigateway.LambdaIntegration(sectionDelete), {
      authorizer: props.authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Public section endpoints: /api/v1/public/sections (unauthenticated)
    const publicResource = apiV1.addResource('public');
    const publicSectionsResource = publicResource.addResource('sections');

    const publicSectionsTreeResource = publicSectionsResource.addResource('tree');
    publicSectionsTreeResource.addMethod('GET', new apigateway.LambdaIntegration(sectionPublic));

    const publicSectionsPathResource = publicSectionsResource.addResource('path');
    const publicSectionsPathProxy = publicSectionsPathResource.addResource('{path+}');
    publicSectionsPathProxy.addMethod('GET', new apigateway.LambdaIntegration(sectionPublic));

    const publicSectionIdResource = publicSectionsResource.addResource('{id}');
    const publicSectionPostsResource = publicSectionIdResource.addResource('posts');
    publicSectionPostsResource.addMethod('GET', new apigateway.LambdaIntegration(sectionPublic));

    // Apply deferred logical ID overrides for service role default policies
    this.applyDeferredPolicyOverrides();
  }

  // ─── Private Helper Methods ─────────────────────────────────────────

  private createFunction(config: LambdaFunctionConfig): lambda.Function {
    const fn = new lambda.Function(this, config.id, {
      functionName: `cms-${config.nameSuffix}-${this.props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: `${config.handler}.handler`,
      code: lambda.Code.fromAsset(config.codePath),
      timeout: Duration.seconds(config.timeout || 30),
      memorySize: config.memorySize || 512,
      environment: { ...this.commonEnv, ...(config.extraEnv || {}) },
      layers: [this.sharedLayer],
      description: config.description,
    });
    preserveLogicalId(fn, config.logicalId);
    // Preserve service role logical ID
    if (config.serviceRoleLogicalId && fn.role) {
      const cfnRole = (fn.role as iam.Role).node.defaultChild as cdk.CfnResource;
      if (cfnRole) cfnRole.overrideLogicalId(config.serviceRoleLogicalId);
    }
    this.allFunctions.set(config.id, fn);
    // Store default policy logical ID for later override
    if (config.defaultPolicyLogicalId) {
      this.pendingPolicyOverrides.set(fn, config.defaultPolicyLogicalId);
    }
    return fn;
  }

  /**
   * Apply deferred logical ID overrides for DefaultPolicy resources.
   * Must be called at the end of the constructor after all permissions are granted.
   */
  private applyDeferredPolicyOverrides(): void {
    for (const [fn, logicalId] of this.pendingPolicyOverrides) {
      const role = fn.role as iam.Role;
      const defaultPolicy = role.node.tryFindChild('DefaultPolicy');
      if (defaultPolicy) {
        const cfnPolicy = (defaultPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
        if (cfnPolicy) cfnPolicy.overrideLogicalId(logicalId);
      }
    }
  }

  private grantDynamoDbIndexQuery(fn: lambda.Function, table: dynamodb.ITable): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:Query'],
      resources: [`${table.tableArn}/index/*`],
    }));
  }

  private grantCognito(fn: lambda.Function, actions: string[]): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions,
      resources: [this.props.userPool.userPoolArn],
    }));
  }

  private grantSesSendEmail(fn: lambda.Function): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
      resources: ['*'],
    }));
  }

  private grantCloudWatchPutMetricData(fn: lambda.Function): void {
    fn.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));
  }
}
