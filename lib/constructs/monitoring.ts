import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface MonitoringConstructProps {
  environment: string;
  alarmEmail?: string;
  lambdaFunctions: Map<string, lambda.Function>;
  api: apigateway.RestApi;
  contentTable: dynamodb.ITable;
  commentsTable: dynamodb.ITable;
  sesFromEmail: string;
}

// Mapping from lambda function label to CloudFormation logical IDs
const ALARM_LOGICAL_IDS: Record<string, { error: string; duration: string; throttle: string }> = {
  Scheduler: { error: 'SchedulerErrorAlarm02DF039E', duration: 'SchedulerDurationAlarm073CA8C2', throttle: 'SchedulerThrottleAlarmBA736BAB' },
  ContentCreate: { error: 'ContentCreateErrorAlarm9B955BAA', duration: 'ContentCreateDurationAlarmB3F8DCB5', throttle: 'ContentCreateThrottleAlarm37534686' },
  ContentGet: { error: 'ContentGetErrorAlarmF16B189F', duration: 'ContentGetDurationAlarmA2652F49', throttle: 'ContentGetThrottleAlarmF98A9716' },
  ContentList: { error: 'ContentListErrorAlarmE83CE872', duration: 'ContentListDurationAlarm0CE4B37A', throttle: 'ContentListThrottleAlarmCFBF0EEE' },
  ContentUpdate: { error: 'ContentUpdateErrorAlarm573D24A5', duration: 'ContentUpdateDurationAlarmE4438238', throttle: 'ContentUpdateThrottleAlarmAAFF31CF' },
  ContentDelete: { error: 'ContentDeleteErrorAlarm1CC5D098', duration: 'ContentDeleteDurationAlarm8CFE998F', throttle: 'ContentDeleteThrottleAlarm512D6C73' },
  MediaUpload: { error: 'MediaUploadErrorAlarmDB10C223', duration: 'MediaUploadDurationAlarm31478823', throttle: 'MediaUploadThrottleAlarmDD3A0E2F' },
  MediaGet: { error: 'MediaGetErrorAlarmEDFB7BFD', duration: 'MediaGetDurationAlarm6659CC46', throttle: 'MediaGetThrottleAlarm7038C257' },
  MediaList: { error: 'MediaListErrorAlarmC4F06845', duration: 'MediaListDurationAlarm5203FA87', throttle: 'MediaListThrottleAlarm3A89F494' },
  MediaDelete: { error: 'MediaDeleteErrorAlarm25C42454', duration: 'MediaDeleteDurationAlarm74D4A840', throttle: 'MediaDeleteThrottleAlarm771EFAD4' },
  UserGetMe: { error: 'UserGetMeErrorAlarmDAE64558', duration: 'UserGetMeDurationAlarm90903D94', throttle: 'UserGetMeThrottleAlarmC38EC4F8' },
  UserUpdateMe: { error: 'UserUpdateMeErrorAlarmEFB51190', duration: 'UserUpdateMeDurationAlarmE95AB75B', throttle: 'UserUpdateMeThrottleAlarm249727C4' },
  UserList: { error: 'UserListErrorAlarmBD86D295', duration: 'UserListDurationAlarm42960897', throttle: 'UserListThrottleAlarmF7EC0F69' },
  UserCreate: { error: 'UserCreateErrorAlarm2BED3956', duration: 'UserCreateDurationAlarm7AC1B79D', throttle: 'UserCreateThrottleAlarmFD789809' },
  UserUpdate: { error: 'UserUpdateErrorAlarm2D7F2819', duration: 'UserUpdateDurationAlarmB5BAD76B', throttle: 'UserUpdateThrottleAlarm669A479C' },
  UserDelete: { error: 'UserDeleteErrorAlarm325419BF', duration: 'UserDeleteDurationAlarmF2DD27EE', throttle: 'UserDeleteThrottleAlarm801EE901' },
  UserResetPassword: { error: 'UserResetPasswordErrorAlarm869A13C6', duration: 'UserResetPasswordDurationAlarmD6D8CADF', throttle: 'UserResetPasswordThrottleAlarmE40ED865' },
  SettingsGet: { error: 'SettingsGetErrorAlarm5AF14CD6', duration: 'SettingsGetDurationAlarmFC3D6433', throttle: 'SettingsGetThrottleAlarmAE9D2C86' },
  SettingsUpdate: { error: 'SettingsUpdateErrorAlarmB672B907', duration: 'SettingsUpdateDurationAlarm930B2BD7', throttle: 'SettingsUpdateThrottleAlarm2CBBC118' },
  SettingsGetPublic: { error: 'SettingsGetPublicErrorAlarmDFD0B656', duration: 'SettingsGetPublicDurationAlarm818F61E0', throttle: 'SettingsGetPublicThrottleAlarmC0D3FDB9' },
  PluginInstall: { error: 'PluginInstallErrorAlarmACFF3CAD', duration: 'PluginInstallDurationAlarm9F8E6193', throttle: 'PluginInstallThrottleAlarmF08D642C' },
  PluginActivate: { error: 'PluginActivateErrorAlarmBF6BAACE', duration: 'PluginActivateDurationAlarmF2258A35', throttle: 'PluginActivateThrottleAlarm049E1153' },
  PluginDeactivate: { error: 'PluginDeactivateErrorAlarm0BE254A9', duration: 'PluginDeactivateDurationAlarmDAA1176A', throttle: 'PluginDeactivateThrottleAlarm85F981B7' },
  PluginList: { error: 'PluginListErrorAlarm1089DFE7', duration: 'PluginListDurationAlarm4B315AD4', throttle: 'PluginListThrottleAlarmFB078819' },
  PluginGetSettings: { error: 'PluginGetSettingsErrorAlarm80551741', duration: 'PluginGetSettingsDurationAlarmA599FA7F', throttle: 'PluginGetSettingsThrottleAlarmD4A09EA0' },
  PluginUpdateSettings: { error: 'PluginUpdateSettingsErrorAlarmC7AD2069', duration: 'PluginUpdateSettingsDurationAlarm0D358BD2', throttle: 'PluginUpdateSettingsThrottleAlarm69981990' },
  CommentList: { error: 'CommentListErrorAlarm9281051B', duration: 'CommentListDurationAlarmEB67D374', throttle: 'CommentListThrottleAlarm07D29D00' },
  CommentCreate: { error: 'CommentCreateErrorAlarmDC58E2F8', duration: 'CommentCreateDurationAlarmADF4282D', throttle: 'CommentCreateThrottleAlarmE78859DA' },
  CommentUpdate: { error: 'CommentUpdateErrorAlarm24D1257B', duration: 'CommentUpdateDurationAlarmBAAFDA85', throttle: 'CommentUpdateThrottleAlarm5D9F281A' },
  CommentDelete: { error: 'CommentDeleteErrorAlarmF96621F5', duration: 'CommentDeleteDurationAlarmE01594B0', throttle: 'CommentDeleteThrottleAlarmFAF3B55B' },
  Register: { error: 'RegisterErrorAlarm4D2D5893', duration: 'RegisterDurationAlarmF565607F', throttle: 'RegisterThrottleAlarm5C96B1E9' },
  VerifyEmail: { error: 'VerifyEmailErrorAlarmD30833FE', duration: 'VerifyEmailDurationAlarm85334C91', throttle: 'VerifyEmailThrottleAlarm2465A156' },
};

export class MonitoringConstruct extends Construct {
  public readonly alarmTopic: sns.Topic;
  public readonly dashboardName: string;

  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    const env = props.environment;

    // SNS Alarm Topic
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `cms-alarms-${env}`,
      displayName: `CMS Alarms - ${env}`,
    });
    preserveLogicalId(this.alarmTopic, 'AlarmTopicD01E77F9');

    // Conditional email subscription
    if (props.alarmEmail) {
      this.alarmTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail)
      );
    }

    const alarmAction = new cloudwatch_actions.SnsAction(this.alarmTopic);

    // Helper: create Lambda alarms (Error, Duration, Throttle)
    const createLambdaAlarms = (fn: lambda.Function, functionLabel: string) => {
      const logicalIds = ALARM_LOGICAL_IDS[functionLabel];

      const errorAlarm = new cloudwatch.Alarm(this, `${functionLabel}ErrorAlarm`, {
        alarmName: `${fn.functionName}-errors`,
        alarmDescription: `Alert when ${functionLabel} errors exceed threshold`,
        metric: fn.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(alarmAction);
      if (logicalIds) preserveLogicalId(errorAlarm, logicalIds.error);

      const durationAlarm = new cloudwatch.Alarm(this, `${functionLabel}DurationAlarm`, {
        alarmName: `${fn.functionName}-duration`,
        alarmDescription: `Alert when ${functionLabel} duration exceeds threshold`,
        metric: fn.metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: fn.timeout ? fn.timeout.toMilliseconds() * 0.8 : 24000,
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      durationAlarm.addAlarmAction(alarmAction);
      if (logicalIds) preserveLogicalId(durationAlarm, logicalIds.duration);

      const throttleAlarm = new cloudwatch.Alarm(this, `${functionLabel}ThrottleAlarm`, {
        alarmName: `${fn.functionName}-throttles`,
        alarmDescription: `Alert when ${functionLabel} is throttled`,
        metric: fn.metricThrottles({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      throttleAlarm.addAlarmAction(alarmAction);
      if (logicalIds) preserveLogicalId(throttleAlarm, logicalIds.throttle);
    };

    // Create alarms for all Lambda functions from the Map
    for (const [key, fn] of props.lambdaFunctions) {
      // Derive label: remove 'Function' suffix, except 'Scheduler' which has no suffix
      const label = key === 'Scheduler' ? 'Scheduler' : key.replace(/Function$/, '');
      createLambdaAlarms(fn, label);
    }

    // API Gateway alarms
    const api4xxErrorAlarm = new cloudwatch.Alarm(this, 'Api4xxErrorAlarm', {
      alarmName: `${props.api.restApiName}-4xx-errors`,
      alarmDescription: 'Alert when API Gateway 4xx errors exceed threshold',
      metric: props.api.metricClientError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api4xxErrorAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(api4xxErrorAlarm, 'Api4xxErrorAlarm1006528F');

    const api5xxErrorAlarm = new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      alarmName: `${props.api.restApiName}-5xx-errors`,
      alarmDescription: 'Alert when API Gateway 5xx errors exceed threshold',
      metric: props.api.metricServerError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    api5xxErrorAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(api5xxErrorAlarm, 'Api5xxErrorAlarm05DAEAC3');

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `${props.api.restApiName}-latency`,
      alarmDescription: 'Alert when API Gateway latency is high',
      metric: props.api.metricLatency({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(apiLatencyAlarm, 'ApiLatencyAlarm453002C0');

    // DynamoDB alarms
    const contentTableReadThrottleAlarm = new cloudwatch.Alarm(this, 'ContentTableReadThrottleAlarm', {
      alarmName: `${props.contentTable.tableName}-read-throttles`,
      alarmDescription: 'Alert when content table read requests are throttled',
      metric: props.contentTable.metricUserErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    contentTableReadThrottleAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(contentTableReadThrottleAlarm, 'ContentTableReadThrottleAlarmFC5F7352');

    const contentTableSystemErrorsAlarm = new cloudwatch.Alarm(this, 'ContentTableSystemErrorsAlarm', {
      alarmName: `${props.contentTable.tableName}-system-errors`,
      alarmDescription: 'Alert when content table has system errors',
      metric: props.contentTable.metricSystemErrorsForOperations({
        operations: [dynamodb.Operation.GET_ITEM, dynamodb.Operation.PUT_ITEM, dynamodb.Operation.QUERY],
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    contentTableSystemErrorsAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(contentTableSystemErrorsAlarm, 'ContentTableSystemErrorsAlarm65C4779C');

    // Phase 2 Alarms

    // SES Bounce Rate Alarm
    const sesBounceRateAlarm = new cloudwatch.Alarm(this, 'SesBounceRateAlarm', {
      alarmName: `cms-ses-bounce-rate-${env}`,
      alarmDescription: 'Alert when SES bounce rate exceeds 5%',
      metric: new cloudwatch.MathExpression({
        expression: '(bounces / sends) * 100',
        usingMetrics: {
          bounces: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.BounceRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
          }),
          sends: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
          }),
        },
      }),
      threshold: 5,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    sesBounceRateAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(sesBounceRateAlarm, 'SesBounceRateAlarm40102DD9');

    // SES Complaint Rate Alarm
    const sesComplaintRateAlarm = new cloudwatch.Alarm(this, 'SesComplaintRateAlarm', {
      alarmName: `cms-ses-complaint-rate-${env}`,
      alarmDescription: 'Alert when SES complaint rate exceeds 0.1%',
      metric: new cloudwatch.MathExpression({
        expression: '(complaints / sends) * 100',
        usingMetrics: {
          complaints: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Reputation.ComplaintRate',
            statistic: 'Average',
            period: cdk.Duration.minutes(15),
          }),
          sends: new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            period: cdk.Duration.minutes(15),
          }),
        },
      }),
      threshold: 0.1,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    sesComplaintRateAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(sesComplaintRateAlarm, 'SesComplaintRateAlarmB5474BD1');

    // User Creation Failure Alarm
    const userCreateFn = props.lambdaFunctions.get('UsersHandlerFunction');
    const userCreationFailureAlarm = new cloudwatch.Alarm(this, 'UserCreationFailureAlarm', {
      alarmName: `cms-user-creation-failures-${env}`,
      alarmDescription: 'Alert when user creation failures exceed threshold',
      metric: userCreateFn!.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 3,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    userCreationFailureAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(userCreationFailureAlarm, 'UserCreationFailureAlarm8148D2FA');

    // Comment Spam Detection Rate Alarm
    const commentSpamRateAlarm = new cloudwatch.Alarm(this, 'CommentSpamRateAlarm', {
      alarmName: `cms-comment-spam-rate-${env}`,
      alarmDescription: 'Alert when comment spam detection rate is high',
      metric: new cloudwatch.Metric({
        namespace: 'ServerlessCMS',
        metricName: 'CommentSpamDetected',
        statistic: 'Sum',
        period: cdk.Duration.hours(1),
      }),
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    commentSpamRateAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(commentSpamRateAlarm, 'CommentSpamRateAlarmB51F434A');

    // CAPTCHA Validation Failure Alarm
    const captchaFailureAlarm = new cloudwatch.Alarm(this, 'CaptchaFailureAlarm', {
      alarmName: `cms-captcha-failures-${env}`,
      alarmDescription: 'Alert when CAPTCHA validation failures exceed threshold',
      metric: new cloudwatch.Metric({
        namespace: 'ServerlessCMS',
        metricName: 'CaptchaValidationFailed',
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 50,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    captchaFailureAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(captchaFailureAlarm, 'CaptchaFailureAlarmD0AFF515');

    // Registration Failure Alarm
    const registerFn = props.lambdaFunctions.get('AuthHandlerFunction');
    const registrationFailureAlarm = new cloudwatch.Alarm(this, 'RegistrationFailureAlarm', {
      alarmName: `cms-registration-failures-${env}`,
      alarmDescription: 'Alert when user registration failures exceed threshold',
      metric: registerFn!.metricErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(15),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    registrationFailureAlarm.addAlarmAction(alarmAction);
    preserveLogicalId(registrationFailureAlarm, 'RegistrationFailureAlarm75DC5782');

    // Phase 2 CloudWatch Dashboard
    const userCreateFunction = props.lambdaFunctions.get('UsersHandlerFunction')!;
    const userUpdateFunction = props.lambdaFunctions.get('UsersHandlerFunction')!;
    const userDeleteFunction = props.lambdaFunctions.get('UsersHandlerFunction')!;
    const registerFunction = props.lambdaFunctions.get('AuthHandlerFunction')!;
    const commentCreateFunction = props.lambdaFunctions.get('CommentsHandlerFunction')!;
    const commentUpdateFunction = props.lambdaFunctions.get('CommentsHandlerFunction')!;
    const commentListFunction = props.lambdaFunctions.get('CommentsHandlerFunction')!;

    this.dashboardName = `cms-phase2-${env}`;
    const phase2Dashboard = new cloudwatch.Dashboard(this, 'Phase2Dashboard', {
      dashboardName: this.dashboardName,
    });
    preserveLogicalId(phase2Dashboard, 'Phase2Dashboard72EA6E5F');

    // Row 1: User Management + Comment System
    phase2Dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'User Management',
        left: [
          userCreateFunction.metricInvocations({ label: 'User Creates' }),
          userUpdateFunction.metricInvocations({ label: 'User Updates' }),
          userDeleteFunction.metricInvocations({ label: 'User Deletes' }),
          registerFunction.metricInvocations({ label: 'Registrations' }),
        ],
        right: [
          userCreateFunction.metricErrors({ label: 'Create Errors', color: cloudwatch.Color.RED }),
          registerFunction.metricErrors({ label: 'Registration Errors', color: cloudwatch.Color.ORANGE }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Comment System',
        left: [
          commentCreateFunction.metricInvocations({ label: 'Comments Created' }),
          commentUpdateFunction.metricInvocations({ label: 'Comments Moderated' }),
          commentListFunction.metricInvocations({ label: 'Comment Views' }),
        ],
        right: [
          commentCreateFunction.metricErrors({ label: 'Create Errors', color: cloudwatch.Color.RED }),
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CommentSpamDetected',
            statistic: 'Sum',
            label: 'Spam Detected',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      })
    );

    // Row 2: Email Delivery + CAPTCHA
    phase2Dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Email Delivery (SES)',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Send',
            statistic: 'Sum',
            label: 'Emails Sent',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Delivery',
            statistic: 'Sum',
            label: 'Delivered',
            color: cloudwatch.Color.GREEN,
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Bounce',
            statistic: 'Sum',
            label: 'Bounces',
            color: cloudwatch.Color.RED,
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/SES',
            metricName: 'Complaint',
            statistic: 'Sum',
            label: 'Complaints',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'CAPTCHA Protection',
        left: [
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CaptchaValidationSuccess',
            statistic: 'Sum',
            label: 'Successful Validations',
            color: cloudwatch.Color.GREEN,
          }),
          new cloudwatch.Metric({
            namespace: 'ServerlessCMS',
            metricName: 'CaptchaValidationFailed',
            statistic: 'Sum',
            label: 'Failed Validations',
            color: cloudwatch.Color.RED,
          }),
        ],
        width: 12,
      })
    );

    // Row 3: Lambda Duration + Comments Table Performance
    phase2Dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Phase 2 Lambda Duration',
        left: [
          userCreateFunction.metricDuration({ label: 'User Create', statistic: 'Average' }),
          registerFunction.metricDuration({ label: 'Registration', statistic: 'Average' }),
          commentCreateFunction.metricDuration({ label: 'Comment Create', statistic: 'Average' }),
          commentUpdateFunction.metricDuration({ label: 'Comment Moderate', statistic: 'Average' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Comments Table Performance',
        left: [
          props.commentsTable.metricConsumedReadCapacityUnits({ label: 'Read Capacity' }),
          props.commentsTable.metricConsumedWriteCapacityUnits({ label: 'Write Capacity' }),
        ],
        right: [
          props.commentsTable.metricUserErrors({ label: 'User Errors', color: cloudwatch.Color.RED }),
          props.commentsTable.metricSystemErrorsForOperations({
            operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.QUERY],
            label: 'System Errors',
            color: cloudwatch.Color.ORANGE,
          }),
        ],
        width: 12,
      })
    );
  }
}
