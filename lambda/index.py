import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ['TABLE_NAME'])

def handler(event, context):
    response = table.update_item(
        Key={'id': 'views'},
        UpdateExpression='ADD #count :inc',
        ExpressionAttributeNames={'#count': 'count'},
        ExpressionAttributeValues={':inc': 1},
        ReturnValues='UPDATED_NEW'
    )
    count = response['Attributes']['count']
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'text/html'},
        'body': f'<html><body><h1>Hello World</h1><p>Page views: {count}</p></body></html>'
    }
