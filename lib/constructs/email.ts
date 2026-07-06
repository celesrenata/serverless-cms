import * as cdk from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { preserveLogicalId } from '../utils/logical-id';

export interface EmailConstructProps {
  environment: string;
  domainName?: string;
  alarmEmail?: string;
  sesFromEmail?: string;
}

export class EmailConstruct extends Construct {
  public readonly sesFromEmail: string;
  public readonly sesConfigurationSetName: string;
  public readonly sesBouncesTopic: sns.Topic;
  public readonly sesComplaintsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: EmailConstructProps) {
    super(scope, id);

    const env = props.environment;

    // Derive SES from email address
    this.sesFromEmail =
      props.sesFromEmail ??
      (env === 'prod'
        ? 'no-reply@celestium.life'
        : `${env}-no-reply@celestium.life`);

    // Create SES email identity
    const emailIdentity = new ses.EmailIdentity(this, 'EmailIdentity', {
      identity: ses.Identity.email(this.sesFromEmail),
      mailFromDomain: props.domainName ? `mail.${props.domainName}` : undefined,
    });
    preserveLogicalId(emailIdentity, 'SesEmailIdentity7B3E04D2');

    // Create SNS topics for SES bounce and complaint handling
    this.sesBouncesTopic = new sns.Topic(this, 'SesBouncesTopic', {
      topicName: `cms-ses-bounces-${env}`,
      displayName: `CMS SES Bounces - ${env}`,
    });
    preserveLogicalId(this.sesBouncesTopic, 'SesBouncesTopic675FB495');

    this.sesComplaintsTopic = new sns.Topic(this, 'SesComplaintsTopic', {
      topicName: `cms-ses-complaints-${env}`,
      displayName: `CMS SES Complaints - ${env}`,
    });
    preserveLogicalId(this.sesComplaintsTopic, 'SesComplaintsTopic4F106851');

    // Subscribe alarm email to bounce/complaint topics if provided
    if (props.alarmEmail) {
      this.sesBouncesTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail),
      );
      this.sesComplaintsTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.alarmEmail),
      );
    }

    // Create configuration set for tracking bounces and complaints
    this.sesConfigurationSetName = `cms-emails-${env}`;

    const sesConfigurationSet = new ses.ConfigurationSet(
      this,
      'SesConfigurationSet',
      {
        configurationSetName: this.sesConfigurationSetName,
      },
    );
    preserveLogicalId(sesConfigurationSet, 'SesConfigurationSet4DAFC9AF');

    // Add event destinations for bounces and complaints
    const bounceDestination = sesConfigurationSet.addEventDestination(
      'BounceDestination',
      {
        destination: ses.EventDestination.snsTopic(this.sesBouncesTopic),
        events: [ses.EmailSendingEvent.BOUNCE],
        enabled: true,
      },
    );
    preserveLogicalId(bounceDestination, 'SesConfigurationSetBounceDestinationED1154B1');

    const complaintDestination = sesConfigurationSet.addEventDestination(
      'ComplaintDestination',
      {
        destination: ses.EventDestination.snsTopic(this.sesComplaintsTopic),
        events: [ses.EmailSendingEvent.COMPLAINT],
        enabled: true,
      },
    );
    preserveLogicalId(complaintDestination, 'SesConfigurationSetComplaintDestination01A56E78');

    // Preserve SNS topic policy logical IDs (created by SES event destinations)
    const bouncesTopicPolicy = this.sesBouncesTopic.node.tryFindChild('Policy');
    if (bouncesTopicPolicy) {
      const cfn = (bouncesTopicPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
      if (cfn) cfn.overrideLogicalId('SesBouncesTopicPolicy7B9FBD47');
    }
    const complaintsTopicPolicy = this.sesComplaintsTopic.node.tryFindChild('Policy');
    if (complaintsTopicPolicy) {
      const cfn = (complaintsTopicPolicy as cdk.Resource).node.defaultChild as cdk.CfnResource;
      if (cfn) cfn.overrideLogicalId('SesComplaintsTopicPolicyB4EB9DCB');
    }
  }
}
