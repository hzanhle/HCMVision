using HcmcRainVision.Backend.Models.DTOs;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Text.Json.Nodes;

namespace HcmcRainVision.Backend.Swagger
{
    public class RequestExampleSchemaFilter : ISchemaFilter
    {
        public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
        {
            if (context.Type == typeof(CheckRouteRequest) && schema is OpenApiSchema concreteSchema)
            {
                concreteSchema.Example = new JsonObject
                {
                    ["currentLatitude"] = 10.7769,
                    ["currentLongitude"] = 106.7009,
                    ["originLatitude"] = null,
                    ["originLongitude"] = null,
                    ["destinationLatitude"] = 10.8727102,
                    ["destinationLongitude"] = 106.7649932,
                    ["routePoints"] = new JsonArray()
                };
            }
        }
    }
}
