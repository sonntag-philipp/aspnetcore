// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

namespace Microsoft.AspNetCore.Razor.Design.IntegrationTests
{
    internal static partial class BuildVariables
    {
        private static string _msBuildPath = string.Empty;
        private static string _MicrosoftNETCoreAppRuntimeVersion = string.Empty;
        private static string _microsoftNetCompilersToolsetPackageVersion = string.Empty;
        private static string _RazorSdkDirectoryRoot = string.Empty;
        private static string _RepoRoot = string.Empty;

        static partial void InitializeVariables();

        public static string MSBuildPath
        {
            get
            {
                InitializeVariables();
                return _msBuildPath;
            }
        }

        public static string MicrosoftNETCoreAppRuntimeVersion
        {
            get
            {
                InitializeVariables();
                return _MicrosoftNETCoreAppRuntimeVersion;
            }
        }

        public static string MicrosoftNetCompilersToolsetPackageVersion
        {
            get
            {
                InitializeVariables();
                return _microsoftNetCompilersToolsetPackageVersion;
            }
        }

        public static string RazorSdkDirectoryRoot
        {
            get
            {
                InitializeVariables();
                return _RazorSdkDirectoryRoot;
            }
        }

        public static string RepoRoot
        {
            get
            {
                InitializeVariables();
                return _RepoRoot;
            }
        }
    }
}
