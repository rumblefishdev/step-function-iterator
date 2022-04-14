STAGING_STACK_NAME=step-functions-iterate
STAGING_REGION=eu-west-1

CAPABILITIES=CAPABILITY_IAM CAPABILITY_AUTO_EXPAND

.PHONY: deploy-staging

deploy-staging:
	sam deploy --template-file template.yml --stack-name $(STAGING_STACK_NAME) --capabilities $(CAPABILITIES)  --region $(STAGING_REGION)

destroy:
	aws cloudformation delete-stack --stack-name $(STAGING_STACK_NAME)   --region $(STAGING_REGION)
