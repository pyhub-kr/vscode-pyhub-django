"""
프로토타입 테스트 코드
이 파일은 Python Extension API 통합을 검증하기 위한 샘플 코드입니다.
"""

import ast
import os
from pathlib import Path
from typing import List, Dict, Any

class DjangoModelParser:
    """Django 모델 파서 프로토타입"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.models: Dict[str, Any] = {}
    
    def find_models_files(self) -> List[Path]:
        """프로젝트 내 모든 models.py 파일 찾기"""
        models_files = []
        for root, dirs, files in os.walk(self.project_root):
            # 가상환경 디렉토리 제외
            dirs[:] = [d for d in dirs if d not in {'.venv', 'venv', '__pycache__', 'node_modules'}]
            
            if 'models.py' in files:
                models_files.append(Path(root) / 'models.py')
        
        return models_files
    
    def parse_model_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """models.py 파일에서 모델 정보 추출"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return []
        
        models = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # Django Model 상속 확인
                if self._is_django_model(node):
                    model_info = {
                        'name': node.name,
                        'fields': self._extract_fields(node),
                        'methods': self._extract_methods(node),
                        'app': file_path.parent.name
                    }
                    models.append(model_info)
        
        return models
    
    def _is_django_model(self, class_node: ast.ClassDef) -> bool:
        """클래스가 Django Model을 상속하는지 확인"""
        for base in class_node.bases:
            if isinstance(base, ast.Attribute):
                if (isinstance(base.value, ast.Name) and 
                    base.value.id == 'models' and 
                    base.attr == 'Model'):
                    return True
            elif isinstance(base, ast.Name) and base.id == 'Model':
                return True
        return False
    
    def _extract_fields(self, class_node: ast.ClassDef) -> List[Dict[str, str]]:
        """모델 필드 추출"""
        fields = []
        
        for node in class_node.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name):
                        # models.XXXField 패턴 확인
                        if isinstance(node.value, ast.Call):
                            if isinstance(node.value.func, ast.Attribute):
                                if (isinstance(node.value.func.value, ast.Name) and
                                    node.value.func.value.id == 'models' and
                                    node.value.func.attr.endswith('Field')):
                                    fields.append({
                                        'name': target.id,
                                        'type': node.value.func.attr
                                    })
        
        return fields
    
    def _extract_methods(self, class_node: ast.ClassDef) -> List[str]:
        """모델 메서드 이름 추출"""
        methods = []
        
        for node in class_node.body:
            if isinstance(node, ast.FunctionDef):
                methods.append(node.name)
        
        return methods
    
    def analyze_project(self):
        """전체 프로젝트 분석"""
        models_files = self.find_models_files()
        
        for file_path in models_files:
            models = self.parse_model_file(file_path)
            for model in models:
                key = f"{model['app']}.{model['name']}"
                self.models[key] = model
        
        return self.models


# URL 패턴 파서
class DjangoUrlParser:
    """Django URL 패턴 파서 프로토타입"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.url_patterns: List[Dict[str, Any]] = []
    
    def find_urls_files(self) -> List[Path]:
        """프로젝트 내 모든 urls.py 파일 찾기"""
        urls_files = []
        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if d not in {'.venv', 'venv', '__pycache__', 'node_modules'}]
            
            if 'urls.py' in files:
                urls_files.append(Path(root) / 'urls.py')
        
        return urls_files
    
    def parse_url_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """urls.py 파일에서 URL 패턴 정보 추출"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return []
        
        patterns = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                # path() 함수 호출 찾기
                if isinstance(node.func, ast.Name) and node.func.id == 'path':
                    pattern_info = self._extract_path_info(node)
                    if pattern_info:
                        patterns.append(pattern_info)
        
        return patterns
    
    def _extract_path_info(self, call_node: ast.Call) -> Dict[str, Any]:
        """path() 함수 호출에서 정보 추출"""
        info = {}
        
        # 첫 번째 인자: URL 패턴
        if call_node.args:
            if isinstance(call_node.args[0], ast.Constant):
                info['pattern'] = call_node.args[0].value
        
        # 두 번째 인자: 뷰
        if len(call_node.args) > 1:
            arg = call_node.args[1]
            if isinstance(arg, ast.Name):
                info['view'] = arg.id
            elif isinstance(arg, ast.Attribute):
                info['view'] = f"{arg.value.id}.{arg.attr}" if isinstance(arg.value, ast.Name) else arg.attr
        
        # name 키워드 인자
        for keyword in call_node.keywords:
            if keyword.arg == 'name' and isinstance(keyword.value, ast.Constant):
                info['name'] = keyword.value.value
        
        return info if 'pattern' in info else None


# 테스트 실행
if __name__ == '__main__':
    # 현재 디렉토리를 프로젝트 루트로 가정
    project_root = os.getcwd()
    
    print("Django Model Parser Test")
    print("=" * 50)
    
    model_parser = DjangoModelParser(project_root)
    models = model_parser.analyze_project()
    
    for key, model in models.items():
        print(f"\nModel: {key}")
        print(f"  Fields: {[f['name'] + ':' + f['type'] for f in model['fields']]}")
        print(f"  Methods: {model['methods']}")
    
    print("\n\nDjango URL Parser Test")
    print("=" * 50)
    
    url_parser = DjangoUrlParser(project_root)
    urls_files = url_parser.find_urls_files()
    
    for file_path in urls_files:
        patterns = url_parser.parse_url_file(file_path)
        if patterns:
            print(f"\nFile: {file_path}")
            for pattern in patterns:
                print(f"  Pattern: {pattern.get('pattern', 'N/A')} -> {pattern.get('view', 'N/A')}")
                if 'name' in pattern:
                    print(f"    Name: {pattern['name']}")